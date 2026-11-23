import webPush from "web-push";
import {
  db,
  participantNotificationAccessTokensTable,
  participantNotificationDeliveriesTable,
  participantNotificationEventsTable,
  participantNotificationPreferencesTable,
  participantNotificationsTable,
  participantPushSubscriptionsTable,
} from "@workspace/db";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { isRegistrationEmailConfigured, sendParticipantUpdateEmail } from "./mailer";
import {
  ACCESS_TOKEN_TTL_MS,
  UNSUBSCRIBE_TOKEN_TTL_MS,
  buildGenericResearchPushPayload,
  buildPublicSiteUrl,
  createOpaqueNotificationToken,
  getResearchUpdateStageLabel,
  hashNotificationToken,
} from "./participantNotificationSecurity";
import { getParticipantPushConfig } from "./participantNotificationService";

const WORKER_INTERVAL_MS = 4_000;
const MAX_BATCH_SIZE = 8;
const STALE_DELIVERY_MS = 15 * 60_000;
let workerRunning = false;
let workerTimer: NodeJS.Timeout | undefined;

type ClaimedDelivery = typeof participantNotificationDeliveriesTable.$inferSelect;
type DeliveryResult = "sent" | "failed" | "unknown" | "skipped";

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
}

function getPushStatusCode(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : 0;
}

function classifyEmailError(error: unknown): DeliveryResult {
  const code = getErrorCode(error).toUpperCase();
  return ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET", "ETLS"].includes(code)
    ? "unknown"
    : "failed";
}

function classifyPushError(error: unknown): DeliveryResult {
  const statusCode = getPushStatusCode(error);
  if (statusCode === 404 || statusCode === 410) return "skipped";
  if (statusCode >= 400 && statusCode < 500) return "failed";
  return "unknown";
}

async function issueOneTimeToken(email: string, purpose: "access" | "unsubscribe", ttlMs: number) {
  const token = createOpaqueNotificationToken();
  const now = new Date();
  await db.insert(participantNotificationAccessTokensTable).values({
    email,
    tokenHash: hashNotificationToken(token),
    purpose,
    expiresAt: new Date(now.getTime() + ttlMs),
  });
  return token;
}

function withToken(path: string, token: string) {
  const url = new URL(buildPublicSiteUrl(path));
  url.searchParams.set("token", token);
  return url.toString();
}

async function claimNextDelivery(): Promise<{ delivery: ClaimedDelivery | null; staleEventIds: number[] }> {
  return db.transaction(async (tx) => {
    const staleBefore = new Date(Date.now() - STALE_DELIVERY_MS);
    const staleRows = await tx.update(participantNotificationDeliveriesTable).set({
      status: "unknown",
      lastError: "توقفت المحاولة دون نتيجة مؤكدة؛ لم تُعد تلقائياً لتجنب التكرار.",
      updatedAt: new Date(),
    }).where(and(
      eq(participantNotificationDeliveriesTable.status, "sending"),
      lt(participantNotificationDeliveriesTable.updatedAt, staleBefore),
    )).returning({ eventId: participantNotificationDeliveriesTable.eventId });

    const [pending] = await tx.select().from(participantNotificationDeliveriesTable)
      .where(eq(participantNotificationDeliveriesTable.status, "pending"))
      .orderBy(asc(participantNotificationDeliveriesTable.createdAt), asc(participantNotificationDeliveriesTable.id))
      .limit(1)
      .for("update", { skipLocked: true });
    const staleEventIds = [...new Set(staleRows.map((row) => row.eventId))];
    if (!pending) return { delivery: null, staleEventIds };

    const [claimed] = await tx.update(participantNotificationDeliveriesTable).set({
      status: "sending",
      attemptCount: sql`${participantNotificationDeliveriesTable.attemptCount} + 1`,
      lastError: "",
      updatedAt: new Date(),
    }).where(eq(participantNotificationDeliveriesTable.id, pending.id)).returning();
    await tx.update(participantNotificationEventsTable).set({
      status: "processing",
      attemptCount: sql`${participantNotificationEventsTable.attemptCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(participantNotificationEventsTable.id, pending.eventId));
    return { delivery: claimed || null, staleEventIds };
  });
}

async function sendEmailDelivery(delivery: ClaimedDelivery): Promise<DeliveryResult> {
  const [notification] = await db.select().from(participantNotificationsTable).where(and(
    eq(participantNotificationsTable.eventId, delivery.eventId),
    eq(participantNotificationsTable.recipientEmail, delivery.recipientEmail),
  )).limit(1);
  if (!notification) return "failed";

  const [preferences] = await db.select().from(participantNotificationPreferencesTable)
    .where(eq(participantNotificationPreferencesTable.email, delivery.recipientEmail)).limit(1);
  if (!preferences?.emailEnabled) return "skipped";
  if (!isRegistrationEmailConfigured()) return "failed";

  const accessToken = await issueOneTimeToken(delivery.recipientEmail, "access", ACCESS_TOKEN_TTL_MS);
  const unsubscribeToken = await issueOneTimeToken(delivery.recipientEmail, "unsubscribe", UNSUBSCRIBE_TOKEN_TTL_MS);
  try {
    await sendParticipantUpdateEmail({
      email: delivery.recipientEmail,
      title: notification.title,
      stageLabel: getResearchUpdateStageLabel(notification.stage),
      message: notification.message,
      inboxUrl: withToken("/notifications/verify", accessToken),
      unsubscribeUrl: withToken("/notifications/unsubscribe", unsubscribeToken),
    });
    return "sent";
  } catch (error) {
    const now = new Date();
    await db.update(participantNotificationAccessTokensTable).set({ consumedAt: now })
      .where(and(
        inArray(participantNotificationAccessTokensTable.tokenHash, [
          hashNotificationToken(accessToken),
          hashNotificationToken(unsubscribeToken),
        ]),
        eq(participantNotificationAccessTokensTable.email, delivery.recipientEmail),
      ));
    const result = classifyEmailError(error);
    logger.warn({
      deliveryId: delivery.id,
      result,
      errorCode: getErrorCode(error).slice(0, 40),
    }, "Participant update email delivery did not complete");
    return result;
  }
}

async function sendPushDelivery(delivery: ClaimedDelivery): Promise<DeliveryResult> {
  if (!delivery.pushSubscriptionId) return "failed";
  const [subscription] = await db.select().from(participantPushSubscriptionsTable).where(and(
    eq(participantPushSubscriptionsTable.id, delivery.pushSubscriptionId),
    eq(participantPushSubscriptionsTable.email, delivery.recipientEmail),
    eq(participantPushSubscriptionsTable.status, "active"),
  )).limit(1);
  if (!subscription) return "skipped";

  const config = getParticipantPushConfig();
  if (!config.enabled || !config.publicKey) return "failed";
  try {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    await webPush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, buildGenericResearchPushPayload(), { TTL: 3600, urgency: "normal" });
    return "sent";
  } catch (error) {
    const statusCode = getPushStatusCode(error);
    const result = classifyPushError(error);
    if (statusCode === 404 || statusCode === 410) {
      await db.update(participantPushSubscriptionsTable).set({
        status: "inactive",
        updatedAt: new Date(),
      }).where(eq(participantPushSubscriptionsTable.id, subscription.id));
      const [remaining] = await db.select({ id: participantPushSubscriptionsTable.id })
        .from(participantPushSubscriptionsTable).where(and(
          eq(participantPushSubscriptionsTable.email, subscription.email),
          eq(participantPushSubscriptionsTable.status, "active"),
        )).limit(1);
      if (!remaining) {
        await db.update(participantNotificationPreferencesTable).set({
          pushEnabled: false,
          updatedAt: new Date(),
        }).where(eq(participantNotificationPreferencesTable.email, subscription.email));
      }
    }
    logger.warn({
      deliveryId: delivery.id,
      result,
      statusCode: statusCode || undefined,
    }, "Participant Web Push delivery did not complete");
    return result;
  }
}

async function finalizeEvent(eventId: number) {
  const deliveries = await db.select({
    status: participantNotificationDeliveriesTable.status,
  }).from(participantNotificationDeliveriesTable)
    .where(eq(participantNotificationDeliveriesTable.eventId, eventId));
  const pending = deliveries.some((delivery) => ["pending", "sending"].includes(delivery.status));
  const failed = deliveries.some((delivery) => delivery.status === "failed");
  const unknown = deliveries.some((delivery) => delivery.status === "unknown");
  const now = new Date();
  await db.update(participantNotificationEventsTable).set({
    status: pending ? (deliveries.some((delivery) => delivery.status === "sending") ? "processing" : "pending")
      : failed ? "failed"
      : unknown ? "unknown"
      : "completed",
    lastError: failed
      ? "تعذر تسليم بعض الإشعارات. يمكن إعادة محاولة الحالات الفاشلة المؤكدة."
      : unknown
        ? "نتيجة بعض عمليات الإرسال غير مؤكدة؛ لم تُكرر تلقائياً."
        : "",
    completedAt: pending ? null : now,
    updatedAt: now,
  }).where(eq(participantNotificationEventsTable.id, eventId));
}

async function processDelivery(delivery: ClaimedDelivery) {
  let result: DeliveryResult;
  try {
    result = delivery.channel === "email"
      ? await sendEmailDelivery(delivery)
      : delivery.channel === "push"
        ? await sendPushDelivery(delivery)
        : "failed";
  } catch (error) {
    result = "unknown";
    logger.warn({
      deliveryId: delivery.id,
      errorCode: getErrorCode(error).slice(0, 40),
    }, "Participant notification delivery ended unexpectedly");
  }

  const errorMessage = result === "failed"
    ? "تعذر إرسال الإشعار. يمكن للمالك إعادة المحاولة بعد معالجة السبب."
    : result === "unknown"
      ? "نتيجة الإرسال غير مؤكدة؛ لم يُكرر تلقائياً."
      : result === "skipped"
        ? "لم تعد وسيلة الإشعار نشطة أو مفعلة."
        : "";
  await db.update(participantNotificationDeliveriesTable).set({
    status: result,
    lastError: errorMessage,
    sentAt: result === "sent" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(participantNotificationDeliveriesTable.id, delivery.id));
  await finalizeEvent(delivery.eventId);
}

export async function processParticipantNotificationBatch() {
  const claimed: ClaimedDelivery[] = [];
  for (let index = 0; index < MAX_BATCH_SIZE; index += 1) {
    const result = await claimNextDelivery();
    for (const eventId of result.staleEventIds) await finalizeEvent(eventId);
    if (!result.delivery) break;
    claimed.push(result.delivery);
  }
  await Promise.all(claimed.map(processDelivery));
  return claimed.length;
}

function runWorkerTick() {
  if (workerRunning) return;
  workerRunning = true;
  void processParticipantNotificationBatch()
    .catch((error) => logger.error({ err: error }, "Participant notification worker failed"))
    .finally(() => { workerRunning = false; });
}

export function startParticipantNotificationWorker() {
  if (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL || workerTimer) return;
  workerTimer = setInterval(runWorkerTick, WORKER_INTERVAL_MS);
  workerTimer.unref();
  runWorkerTick();
  logger.info("Participant notification worker started.");
}
