import {
  db,
  researchProgramsTable,
  socialConnectionsTable,
  socialSeatUpdateDeliveriesTable,
  socialSeatUpdateEventsTable,
  type SocialConnection,
  type SocialSeatUpdateEvent,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { getOpportunityVisibility } from "./opportunityVisibility";
import { getSiteContentSettings } from "./siteContentSettings";
import { buildSocialPostContent } from "./socialPostContent";
import { SocialProviderError, publishToConnection } from "./socialProviders";
import { refreshXConnection } from "./socialTokenRefresh";

const WORKER_INTERVAL_MS = 5_000;
const STALE_EVENT_MS = 15 * 60_000;
const GLOBAL_WORKER_LOCK = 5713;
let workerRunning = false;
let workerTimer: NodeJS.Timeout | undefined;

type DeliveryOutcome = "published" | "failed" | "unknown" | "skipped";

async function claimNextEvent(): Promise<SocialSeatUpdateEvent | null> {
  return db.transaction(async (tx) => {
    // A single database-backed claim keeps every opportunity's seat snapshots in order,
    // even if the Render web service is running more than one instance.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${GLOBAL_WORKER_LOCK}, 1)`);
    const [processing] = await tx.select().from(socialSeatUpdateEventsTable)
      .where(eq(socialSeatUpdateEventsTable.status, "processing"))
      .limit(1);

    if (processing) {
      if (processing.updatedAt.getTime() < Date.now() - STALE_EVENT_MS) {
        const staleBefore = new Date(Date.now() - STALE_EVENT_MS);
        await tx.update(socialSeatUpdateDeliveriesTable).set({
          status: "unknown",
          lastError: "توقف العامل قبل تسجيل النتيجة. تحقق من الحساب قبل إعادة النشر.",
          updatedAt: new Date(),
        }).where(and(
          eq(socialSeatUpdateDeliveriesTable.eventId, processing.id),
          eq(socialSeatUpdateDeliveriesTable.status, "publishing"),
          lt(socialSeatUpdateDeliveriesTable.updatedAt, staleBefore),
        ));
        await tx.update(socialSeatUpdateEventsTable).set({
          status: "pending",
          lastError: "استُعيد تحديث متوقف؛ الحالات غير المؤكدة لن تُرسل مرة أخرى تلقائياً.",
          updatedAt: new Date(),
        }).where(eq(socialSeatUpdateEventsTable.id, processing.id));
      }
      return null;
    }

    const [pending] = await tx.select().from(socialSeatUpdateEventsTable)
      .where(eq(socialSeatUpdateEventsTable.status, "pending"))
      .orderBy(asc(socialSeatUpdateEventsTable.createdAt), asc(socialSeatUpdateEventsTable.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!pending) return null;

    const [claimed] = await tx.update(socialSeatUpdateEventsTable).set({
      status: "processing",
      attemptCount: sql`${socialSeatUpdateEventsTable.attemptCount} + 1`,
      lastError: "",
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateEventsTable.id, pending.id)).returning();
    return claimed || null;
  });
}

async function reserveDelivery(
  event: SocialSeatUpdateEvent,
  connection: SocialConnection,
  content: string,
) {
  return db.transaction(async (tx) => {
    const lockKey = `${event.id}:${connection.platform}:${connection.accountId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(5714, hashtext(${lockKey}))`);
    const [existing] = await tx.select().from(socialSeatUpdateDeliveriesTable).where(and(
      eq(socialSeatUpdateDeliveriesTable.eventId, event.id),
      eq(socialSeatUpdateDeliveriesTable.platform, connection.platform),
      eq(socialSeatUpdateDeliveriesTable.accountId, connection.accountId),
    )).limit(1);

    if (existing?.status === "published" || existing?.status === "unknown" || existing?.status === "skipped") {
      return { delivery: existing, skip: true };
    }
    if (existing?.status === "publishing") {
      if (Date.now() - existing.updatedAt.getTime() > STALE_EVENT_MS) {
        const [updated] = await tx.update(socialSeatUpdateDeliveriesTable).set({
          status: "unknown",
          lastError: "انتهت مهلة النشر دون نتيجة مؤكدة. تحقق من الحساب قبل أي إعادة نشر.",
          updatedAt: new Date(),
        }).where(eq(socialSeatUpdateDeliveriesTable.id, existing.id)).returning();
        return { delivery: updated || existing, skip: true };
      }
      return { delivery: existing, skip: true };
    }
    if (existing) {
      const [updated] = await tx.update(socialSeatUpdateDeliveriesTable).set({
        connectionId: connection.id,
        accountName: connection.accountName,
        status: "publishing",
        content,
        externalPostId: "",
        lastError: "",
        publishedAt: null,
        updatedAt: new Date(),
      }).where(eq(socialSeatUpdateDeliveriesTable.id, existing.id)).returning();
      return { delivery: updated || existing, skip: false };
    }
    const [created] = await tx.insert(socialSeatUpdateDeliveriesTable).values({
      eventId: event.id,
      connectionId: connection.id,
      platform: connection.platform,
      accountId: connection.accountId,
      accountName: connection.accountName,
      status: "publishing",
      content,
      updatedAt: new Date(),
    }).onConflictDoNothing().returning();
    if (created) return { delivery: created, skip: false };

    const [conflict] = await tx.select().from(socialSeatUpdateDeliveriesTable).where(and(
      eq(socialSeatUpdateDeliveriesTable.eventId, event.id),
      eq(socialSeatUpdateDeliveriesTable.platform, connection.platform),
      eq(socialSeatUpdateDeliveriesTable.accountId, connection.accountId),
    )).limit(1);
    return { delivery: conflict, skip: true };
  });
}

async function publishDelivery(
  event: SocialSeatUpdateEvent,
  connection: SocialConnection,
  content: ReturnType<typeof buildSocialPostContent>,
): Promise<DeliveryOutcome> {
  const reserved = await reserveDelivery(event, connection, content.text);
  if (!reserved.delivery) return "failed";
  if (reserved.skip) return reserved.delivery.status as DeliveryOutcome;

  try {
    const [currentConnection] = await db.select().from(socialConnectionsTable).where(and(
      eq(socialConnectionsTable.id, connection.id),
      eq(socialConnectionsTable.status, "active"),
    )).limit(1);
    if (!currentConnection) {
      await db.update(socialSeatUpdateDeliveriesTable).set({
        status: "skipped",
        lastError: "فُصل الحساب قبل إرسال تحديث المقاعد.",
        updatedAt: new Date(),
      }).where(eq(socialSeatUpdateDeliveriesTable.id, reserved.delivery.id));
      return "skipped";
    }

    const activeConnection = await refreshXConnection(currentConnection);
    const externalPostId = await publishToConnection(activeConnection, content);
    await db.update(socialSeatUpdateDeliveriesTable).set({
      status: "published",
      externalPostId: externalPostId.slice(0, 300),
      lastError: "",
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateDeliveriesTable.id, reserved.delivery.id));
    return "published";
  } catch (error) {
    const providerError = error instanceof SocialProviderError
      ? error
      : new SocialProviderError("تعذر إرسال تحديث المقاعد إلى هذا الحساب.");
    const status = providerError.outcomeUnknown ? "unknown" : "failed";
    if (providerError.statusCode === 401 || providerError.statusCode === 403) {
      await db.update(socialConnectionsTable).set({ status: "needs_reauth", updatedAt: new Date() })
        .where(eq(socialConnectionsTable.id, connection.id));
    }
    await db.update(socialSeatUpdateDeliveriesTable).set({
      status,
      lastError: providerError.message.slice(0, 500),
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateDeliveriesTable.id, reserved.delivery.id));
    return status;
  }
}

async function finalizeEvent(event: SocialSeatUpdateEvent) {
  const deliveries = await db.select().from(socialSeatUpdateDeliveriesTable)
    .where(eq(socialSeatUpdateDeliveriesTable.eventId, event.id));
  if (deliveries.length === 0) {
    await db.update(socialSeatUpdateEventsTable).set({
      status: "skipped",
      lastError: "لم يكن هناك حساب تواصل نشط عند معالجة تحديث المقاعد.",
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateEventsTable.id, event.id));
    return;
  }

  const hasDefiniteFailure = deliveries.some((delivery) => delivery.status === "failed");
  const hasUnknownOutcome = deliveries.some((delivery) => delivery.status === "unknown");
  const unfinished = deliveries.some((delivery) => delivery.status === "publishing");
  if (unfinished) {
    await db.update(socialSeatUpdateEventsTable).set({
      status: "pending",
      lastError: "بعض الحسابات لم تُعالج بعد؛ سيُستكمل التحديث تلقائياً.",
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateEventsTable.id, event.id));
    return;
  }
  await db.update(socialSeatUpdateEventsTable).set({
    status: hasDefiniteFailure ? "failed" : hasUnknownOutcome ? "unknown" : "completed",
    lastError: deliveries.filter((delivery) => delivery.lastError).map((delivery) => delivery.lastError).join(" · ").slice(0, 500),
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(socialSeatUpdateEventsTable.id, event.id));
}

export async function processNextSocialSeatUpdate(): Promise<boolean> {
  const event = await claimNextEvent();
  if (!event) return false;

  try {
    const [opportunity] = await db.select().from(researchProgramsTable)
      .where(eq(researchProgramsTable.id, event.opportunityId)).limit(1);
    if (!opportunity) {
      await db.update(socialSeatUpdateEventsTable).set({
        status: "skipped",
        lastError: "الفرصة غير متاحة للنشر العام.",
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(socialSeatUpdateEventsTable.id, event.id));
      return true;
    }

    const hiddenFields = (await getOpportunityVisibility([event.opportunityId])).get(event.opportunityId)
      ?? ["title", "preview", "specialty", "image"];
    const settings = await getSiteContentSettings().catch(() => null);
    const content = buildSocialPostContent({
      id: opportunity.id,
      titleEn: opportunity.titleEn,
      specialtyEn: opportunity.specialtyEn,
      imagePath: opportunity.imagePath,
      hiddenFields,
      siteImageUrl: settings?.brand?.socialShareImageUrl,
      seatUpdate: {
        seatsLeft: event.seatsLeft,
        totalSeats: event.totalSeats,
        firstAuthorSeatsLeft: event.firstAuthorSeatsLeft,
        coAuthorSeatsLeft: event.coAuthorSeatsLeft,
      },
    });

    const connections = await db.select().from(socialConnectionsTable)
      .where(eq(socialConnectionsTable.status, "active"));
    for (let index = 0; index < connections.length; index += 4) {
      await Promise.all(connections.slice(index, index + 4)
        .map((connection) => publishDelivery(event, connection, content)));
    }
    await finalizeEvent(event);
  } catch (error) {
    logger.error({ err: error, eventId: event.id }, "Social seat update processing failed");
    await db.update(socialSeatUpdateEventsTable).set({
      status: "failed",
      lastError: "تعذر معالجة تحديث المقاعد. يمكن للمالك إعادة المحاولة من لوحة الإدارة.",
      updatedAt: new Date(),
    }).where(eq(socialSeatUpdateEventsTable.id, event.id));
  }
  return true;
}

function runWorkerTick() {
  if (workerRunning) return;
  workerRunning = true;
  void processNextSocialSeatUpdate()
    .catch((error) => logger.error({ err: error }, "Social seat update worker failed"))
    .finally(() => { workerRunning = false; });
}

export function startSocialSeatUpdateWorker() {
  if (process.env["NODE_ENV"] !== "production" || !process.env["DATABASE_URL"] || workerTimer) return;
  workerTimer = setInterval(runWorkerTick, WORKER_INTERVAL_MS);
  workerTimer.unref();
  runWorkerTick();
  logger.info("Social seat update worker started.");
}

export async function retrySocialSeatUpdate(eventId: number) {
  const [event] = await db.select().from(socialSeatUpdateEventsTable)
    .where(eq(socialSeatUpdateEventsTable.id, eventId)).limit(1);
  if (!event) return { ok: false as const, status: 404, message: "تحديث المقاعد غير موجود." };
  if (event.status !== "failed") {
    return { ok: false as const, status: 409, message: "تُعاد المحاولة للتحديثات التي فشلت بوضوح فقط؛ تحقق من الحسابات ذات النتيجة غير المؤكدة." };
  }
  const failedDeliveries = await db.select().from(socialSeatUpdateDeliveriesTable).where(and(
    eq(socialSeatUpdateDeliveriesTable.eventId, eventId),
    eq(socialSeatUpdateDeliveriesTable.status, "failed"),
  ));
  if (failedDeliveries.length === 0) {
    return { ok: false as const, status: 409, message: "لا توجد محاولات فاشلة مؤكدة لإعادة الإرسال." };
  }
  await db.update(socialSeatUpdateEventsTable).set({
    status: "pending",
    lastError: "",
    completedAt: null,
    updatedAt: new Date(),
  }).where(eq(socialSeatUpdateEventsTable.id, eventId));
  return { ok: true as const, message: "أُعيد وضع تحديث المقاعد في قائمة الإرسال." };
}

export async function listSocialSeatUpdates(opportunityId: number) {
  const events = await db.select().from(socialSeatUpdateEventsTable)
    .where(eq(socialSeatUpdateEventsTable.opportunityId, opportunityId))
    .orderBy(desc(socialSeatUpdateEventsTable.createdAt))
    .limit(30);
  const recent = events;
  if (recent.length === 0) return [];
  const deliveries = await db.select().from(socialSeatUpdateDeliveriesTable)
    .where(inArray(socialSeatUpdateDeliveriesTable.eventId, recent.map((event) => event.id)));
  const byEvent = new Map<number, typeof deliveries>();
  for (const delivery of deliveries) {
    const group = byEvent.get(delivery.eventId) || [];
    group.push(delivery);
    byEvent.set(delivery.eventId, group);
  }
  return recent.map((event) => ({
    id: event.id,
    seatsLeft: event.seatsLeft,
    totalSeats: event.totalSeats,
    firstAuthorSeatsLeft: event.firstAuthorSeatsLeft,
    coAuthorSeatsLeft: event.coAuthorSeatsLeft,
    status: event.status,
    lastError: event.lastError,
    createdAt: event.createdAt,
    deliveries: (byEvent.get(event.id) || []).map((delivery) => ({
      id: delivery.id,
      platform: delivery.platform,
      accountName: delivery.accountName,
      status: delivery.status,
      lastError: delivery.lastError,
      publishedAt: delivery.publishedAt,
    })),
  }));
}
