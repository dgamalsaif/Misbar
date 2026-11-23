import {
  db,
  participantNotificationDeliveriesTable,
  participantNotificationEventsTable,
  participantNotificationPreferencesTable,
  participantNotificationsTable,
  participantPushSubscriptionsTable,
  registrationsTable,
  researchProgramsTable,
  type ParticipantNotificationEvent,
} from "@workspace/db";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { isRegistrationEmailConfigured } from "./mailer";
import { isSupportedWebPushEndpoint } from "./participantNotificationSecurity";
import {
  eligibleNotificationEmails,
  isSameNotificationEvent,
  RETRYABLE_DELIVERY_STATUSES,
  shouldQueueEmailNotification,
  shouldQueuePushNotification,
} from "./participantNotificationRules";

export const UPDATE_STAGES = [
  "general_update",
  "seats_full",
  "ethics_approved",
  "submitted",
  "under_review",
  "accepted",
  "published",
  "completed",
] as const;

export type ResearchUpdateStage = typeof UPDATE_STAGES[number];
export type NotificationDeliveryStatus = "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped";

export type ParticipantNotificationEventSummary = {
  id: number;
  opportunityId: number;
  idempotencyKey: string;
  stage: string;
  title: string;
  message: string;
  status: string;
  totalRecipients: number;
  emailQueued: number;
  pushQueued: number;
  sent: number;
  failed: number;
  unknown: number;
  skipped: number;
  lastError: string;
  createdAt: Date;
  emailAvailable: boolean;
  pushAvailable: boolean;
};

type DeliveryCounts = {
  emailQueued: number;
  pushQueued: number;
  sent: number;
  failed: number;
  unknown: number;
  skipped: number;
};

export function getParticipantPushConfig(env: NodeJS.ProcessEnv = process.env) {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = env.VAPID_SUBJECT?.trim() || "";
  const publicKeyValid = /^[A-Za-z0-9_-]+={0,2}$/.test(publicKey) &&
    Buffer.from(publicKey, "base64url").byteLength === 65;
  const privateKeyValid = /^[A-Za-z0-9_-]+={0,2}$/.test(privateKey) &&
    Buffer.from(privateKey, "base64url").byteLength === 32;
  return {
    enabled: Boolean(publicKeyValid && privateKeyValid && /^(mailto:|https:\/\/)/i.test(subject)),
    publicKey: publicKey || null,
    privateKey,
    subject,
  };
}

function toDeliveryCounts(rows: Array<{ channel: string; status: string }>): DeliveryCounts {
  const counts: DeliveryCounts = { emailQueued: 0, pushQueued: 0, sent: 0, failed: 0, unknown: 0, skipped: 0 };
  for (const row of rows) {
    if (row.channel === "email") counts.emailQueued += 1;
    if (row.channel === "push") counts.pushQueued += 1;
    if (row.status === "sent") counts.sent += 1;
    if (row.status === "failed") counts.failed += 1;
    if (row.status === "unknown") counts.unknown += 1;
    if (row.status === "skipped") counts.skipped += 1;
  }
  return counts;
}

function summarizeEvent(
  event: ParticipantNotificationEvent,
  totalRecipients: number,
  deliveryRows: Array<{ channel: string; status: string }>,
): ParticipantNotificationEventSummary {
  return {
    id: event.id,
    opportunityId: event.opportunityId,
    idempotencyKey: event.idempotencyKey,
    stage: event.stage,
    title: event.title,
    message: event.message,
    status: event.status,
    totalRecipients,
    ...toDeliveryCounts(deliveryRows),
    lastError: event.lastError,
    createdAt: event.createdAt,
    emailAvailable: isRegistrationEmailConfigured(),
    pushAvailable: getParticipantPushConfig().enabled,
  };
}

async function summarizeEvents(events: ParticipantNotificationEvent[]) {
  if (events.length === 0) return [];
  const ids = events.map((event) => event.id);
  const [notifications, deliveryRows] = await Promise.all([
    db.select({
      eventId: participantNotificationsTable.eventId,
    }).from(participantNotificationsTable).where(inArray(participantNotificationsTable.eventId, ids)),
    db.select({
      eventId: participantNotificationDeliveriesTable.eventId,
      channel: participantNotificationDeliveriesTable.channel,
      status: participantNotificationDeliveriesTable.status,
    }).from(participantNotificationDeliveriesTable).where(inArray(participantNotificationDeliveriesTable.eventId, ids)),
  ]);
  const recipientsByEvent = new Map<number, number>();
  const deliveriesByEvent = new Map<number, Array<{ channel: string; status: string }>>();
  for (const row of notifications) recipientsByEvent.set(row.eventId, (recipientsByEvent.get(row.eventId) || 0) + 1);
  for (const row of deliveryRows) {
    const rows = deliveriesByEvent.get(row.eventId) || [];
    rows.push({ channel: row.channel, status: row.status });
    deliveriesByEvent.set(row.eventId, rows);
  }
  return events.map((event) => summarizeEvent(
    event,
    recipientsByEvent.get(event.id) || 0,
    deliveriesByEvent.get(event.id) || [],
  ));
}

export async function publishParticipantResearchUpdate(input: {
  opportunityId: number;
  idempotencyKey: string;
  stage: ResearchUpdateStage;
  message: string;
  publishedBy: string;
}) {
  const [opportunity] = await db.select().from(researchProgramsTable)
    .where(eq(researchProgramsTable.id, input.opportunityId)).limit(1);
  if (!opportunity) return { ok: false as const, status: 404, message: "الفرصة البحثية غير موجودة." };

  const title = opportunity.titleAr.trim() || opportunity.titleEn.trim() || "تحديث بحثي جديد";
  const message = input.message.trim();
  if (!message) return { ok: false as const, status: 400, message: "اكتب تفاصيل التحديث قبل نشره." };

  const result = await db.transaction(async (tx) => {
    const [createdEvent] = await tx.insert(participantNotificationEventsTable).values({
      opportunityId: opportunity.id,
      idempotencyKey: input.idempotencyKey,
      stage: input.stage,
      title,
      message,
      publishedBy: input.publishedBy.slice(0, 254),
      status: "pending",
      updatedAt: new Date(),
    }).onConflictDoNothing({
      target: participantNotificationEventsTable.idempotencyKey,
    }).returning();

    if (!createdEvent) {
      const [existing] = await tx.select().from(participantNotificationEventsTable)
        .where(eq(participantNotificationEventsTable.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (!existing) return { ok: false as const, status: 503, message: "تعذر حفظ سجل التحديث." };
      if (!isSameNotificationEvent(existing, {
        opportunityId: opportunity.id,
        stage: input.stage,
        title,
        message,
      })) {
        return { ok: false as const, status: 409, message: "مفتاح الطلب استُخدم سابقاً لمحتوى مختلف." };
      }
      return { ok: true as const, eventId: existing.id, duplicate: true };
    }

    const registrations = await tx.select({
      email: registrationsTable.email,
      status: registrationsTable.status,
    }).from(registrationsTable).where(and(
      eq(registrationsTable.researchId, opportunity.id),
      notInArray(registrationsTable.status, ["rejected", "deleted"]),
    ));
    const recipients = eligibleNotificationEmails(registrations);
    const pushConfig = getParticipantPushConfig();
    let deliveryCount = 0;

    for (const email of recipients) {
      await tx.insert(participantNotificationPreferencesTable)
        .values({ email })
        .onConflictDoNothing({ target: participantNotificationPreferencesTable.email });
      const [preferences] = await tx.select().from(participantNotificationPreferencesTable)
        .where(eq(participantNotificationPreferencesTable.email, email)).limit(1);

      await tx.insert(participantNotificationsTable).values({
        eventId: createdEvent.id,
        opportunityId: opportunity.id,
        recipientEmail: email,
        stage: input.stage,
        title,
        message,
      }).onConflictDoNothing({
        target: [
          participantNotificationsTable.eventId,
          participantNotificationsTable.recipientEmail,
        ],
      });

      if (shouldQueueEmailNotification(preferences?.emailEnabled ?? false, isRegistrationEmailConfigured())) {
        const [delivery] = await tx.insert(participantNotificationDeliveriesTable).values({
          eventId: createdEvent.id,
          recipientEmail: email,
          channel: "email",
          targetKey: email,
        }).onConflictDoNothing().returning();
        if (delivery) deliveryCount += 1;
      }

      if (shouldQueuePushNotification(preferences?.pushEnabled ?? false, pushConfig.enabled)) {
        const subscriptions = await tx.select({
          id: participantPushSubscriptionsTable.id,
        }).from(participantPushSubscriptionsTable).where(and(
          eq(participantPushSubscriptionsTable.email, email),
          eq(participantPushSubscriptionsTable.status, "active"),
        ));
        for (const subscription of subscriptions) {
          const [delivery] = await tx.insert(participantNotificationDeliveriesTable).values({
            eventId: createdEvent.id,
            recipientEmail: email,
            channel: "push",
            targetKey: `subscription:${subscription.id}`,
            pushSubscriptionId: subscription.id,
          }).onConflictDoNothing().returning();
          if (delivery) deliveryCount += 1;
        }
      }
    }

    if (recipients.length === 0 || deliveryCount === 0) {
      await tx.update(participantNotificationEventsTable).set({
        status: recipients.length === 0 ? "skipped" : "completed",
        lastError: recipients.length === 0 ? "لا يوجد مشاركون مسجلون مؤهلون لهذه الفرصة." : "",
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(participantNotificationEventsTable.id, createdEvent.id));
    }
    return { ok: true as const, eventId: createdEvent.id, duplicate: false };
  });

  if (!result.ok) return result;
  const [event] = await db.select().from(participantNotificationEventsTable)
    .where(eq(participantNotificationEventsTable.id, result.eventId)).limit(1);
  if (!event) return { ok: false as const, status: 503, message: "تعذر قراءة سجل التحديث بعد الحفظ." };
  const [summary] = await summarizeEvents([event]);
  return { ok: true as const, summary, duplicate: result.duplicate };
}

export async function listProgramParticipantNotifications(opportunityId: number) {
  const events = await db.select().from(participantNotificationEventsTable)
    .where(eq(participantNotificationEventsTable.opportunityId, opportunityId))
    .orderBy(desc(participantNotificationEventsTable.createdAt), desc(participantNotificationEventsTable.id))
    .limit(20);
  return summarizeEvents(events);
}

export async function retryParticipantNotificationEvent(eventId: number) {
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(participantNotificationEventsTable)
      .where(eq(participantNotificationEventsTable.id, eventId))
      .for("update")
      .limit(1);
    if (!event) return { ok: false as const, status: 404, message: "تحديث المشاركين غير موجود." };

    const failedDeliveries = await tx.update(participantNotificationDeliveriesTable).set({
      status: "pending",
      lastError: "",
      updatedAt: new Date(),
    }).where(and(
      eq(participantNotificationDeliveriesTable.eventId, eventId),
      inArray(participantNotificationDeliveriesTable.status, RETRYABLE_DELIVERY_STATUSES),
    )).returning({ id: participantNotificationDeliveriesTable.id });
    if (!failedDeliveries.length) {
      return { ok: false as const, status: 409, message: "لا توجد عمليات إرسال فاشلة مؤكدة لإعادة المحاولة." };
    }

    await tx.update(participantNotificationEventsTable).set({
      status: "pending",
      attemptCount: sql`${participantNotificationEventsTable.attemptCount} + 1`,
      lastError: "",
      completedAt: null,
      updatedAt: new Date(),
    }).where(eq(participantNotificationEventsTable.id, eventId));
    return { ok: true as const, queued: failedDeliveries.length, message: "أُعيدت محاولة الإرسال للفشل المؤكد فقط." };
  });
}

export async function getParticipantInbox(email: string) {
  const [preferences, notifications, pushDevices] = await Promise.all([
    db.select().from(participantNotificationPreferencesTable)
      .where(eq(participantNotificationPreferencesTable.email, email)).limit(1),
    db.select().from(participantNotificationsTable)
      .where(eq(participantNotificationsTable.recipientEmail, email))
      .orderBy(desc(participantNotificationsTable.createdAt), desc(participantNotificationsTable.id))
      .limit(100),
    db.select({
      id: participantPushSubscriptionsTable.id,
      deviceLabel: participantPushSubscriptionsTable.deviceLabel,
      createdAt: participantPushSubscriptionsTable.createdAt,
      updatedAt: participantPushSubscriptionsTable.updatedAt,
    }).from(participantPushSubscriptionsTable).where(and(
      eq(participantPushSubscriptionsTable.email, email),
      eq(participantPushSubscriptionsTable.status, "active"),
    )).orderBy(desc(participantPushSubscriptionsTable.updatedAt)),
  ]);
  return {
    notifications,
    unreadCount: notifications.filter((notification) => notification.readAt === null).length,
    pushDevices,
    preferences: {
      emailEnabled: preferences[0]?.emailEnabled ?? true,
      emailVerified: Boolean(preferences[0]?.emailVerifiedAt),
      pushEnabled: preferences[0]?.pushEnabled ?? false,
      pushAvailable: getParticipantPushConfig().enabled,
    },
  };
}

export async function updateParticipantEmailPreference(email: string, emailEnabled: boolean) {
  await db.insert(participantNotificationPreferencesTable).values({
    email,
    emailEnabled,
    emailVerifiedAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: participantNotificationPreferencesTable.email,
    set: { emailEnabled, emailVerifiedAt: new Date(), updatedAt: new Date() },
  });
  const [preferences] = await db.select().from(participantNotificationPreferencesTable)
    .where(eq(participantNotificationPreferencesTable.email, email)).limit(1);
  return preferences;
}

export async function saveParticipantPushSubscription(
  email: string,
  subscription: { endpoint: string; deviceLabel: string; p256dh: string; auth: string },
) {
  if (!isSupportedWebPushEndpoint(subscription.endpoint)) {
    return { ok: false as const, status: 400, message: "عنوان الإشعار يجب أن يكون من مزود Web Push موثوق عبر HTTPS." };
  }
  const [existing] = await db.select().from(participantPushSubscriptionsTable)
    .where(eq(participantPushSubscriptionsTable.endpoint, subscription.endpoint)).limit(1);
  if (existing && existing.email !== email) {
    return { ok: false as const, status: 409, message: "هذا المتصفح مرتبط ببريد موثّق آخر." };
  }

  await db.insert(participantPushSubscriptionsTable).values({
    email,
    endpoint: subscription.endpoint,
    deviceLabel: subscription.deviceLabel,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    status: "active",
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: participantPushSubscriptionsTable.endpoint,
    set: {
      email,
      deviceLabel: subscription.deviceLabel,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      status: "active",
      updatedAt: new Date(),
    },
  });
  await db.insert(participantNotificationPreferencesTable).values({
    email,
    pushEnabled: true,
    emailVerifiedAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: participantNotificationPreferencesTable.email,
    set: { pushEnabled: true, emailVerifiedAt: new Date(), updatedAt: new Date() },
  });
  return { ok: true as const };
}

export async function removeParticipantPushSubscription(email: string, endpoint: string) {
  await db.update(participantPushSubscriptionsTable).set({
    status: "inactive",
    updatedAt: new Date(),
  }).where(and(
    eq(participantPushSubscriptionsTable.email, email),
    eq(participantPushSubscriptionsTable.endpoint, endpoint),
  ));
  const [remaining] = await db.select({
    id: participantPushSubscriptionsTable.id,
  }).from(participantPushSubscriptionsTable).where(and(
    eq(participantPushSubscriptionsTable.email, email),
    eq(participantPushSubscriptionsTable.status, "active"),
  )).limit(1);
  const [preferences] = await db.update(participantNotificationPreferencesTable).set({
    pushEnabled: Boolean(remaining),
    updatedAt: new Date(),
  }).where(eq(participantNotificationPreferencesTable.email, email)).returning();
  return preferences;
}

export async function removeParticipantPushDevice(email: string, deviceId: number) {
  const [removed] = await db.update(participantPushSubscriptionsTable).set({
    status: "inactive",
    updatedAt: new Date(),
  }).where(and(
    eq(participantPushSubscriptionsTable.id, deviceId),
    eq(participantPushSubscriptionsTable.email, email),
    eq(participantPushSubscriptionsTable.status, "active"),
  )).returning({ id: participantPushSubscriptionsTable.id });
  if (!removed) return null;

  const [remaining] = await db.select({ id: participantPushSubscriptionsTable.id })
    .from(participantPushSubscriptionsTable).where(and(
      eq(participantPushSubscriptionsTable.email, email),
      eq(participantPushSubscriptionsTable.status, "active"),
    )).limit(1);
  await db.update(participantNotificationPreferencesTable).set({
    pushEnabled: Boolean(remaining),
    updatedAt: new Date(),
  }).where(eq(participantNotificationPreferencesTable.email, email));
  return getParticipantInbox(email);
}

export async function disableEmailFromUnsubscribeToken(email: string) {
  await db.update(participantNotificationPreferencesTable).set({
    emailEnabled: false,
    updatedAt: new Date(),
  }).where(eq(participantNotificationPreferencesTable.email, email));
}

export async function markParticipantNotificationRead(email: string, notificationId: number) {
  const [notification] = await db.update(participantNotificationsTable).set({
    readAt: new Date(),
  }).where(and(
    eq(participantNotificationsTable.id, notificationId),
    eq(participantNotificationsTable.recipientEmail, email),
  )).returning();
  return notification || null;
}

export async function getRegistrationEmailsForOpportunity(opportunityId: number) {
  const rows = await db.select({
    email: registrationsTable.email,
    status: registrationsTable.status,
  })
    .from(registrationsTable)
    .where(and(
      eq(registrationsTable.researchId, opportunityId),
      notInArray(registrationsTable.status, ["rejected", "deleted"]),
    ));
  return eligibleNotificationEmails(rows);
}
