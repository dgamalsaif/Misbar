import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const participantNotificationEventsTable = pgTable(
  "participant_notification_events",
  {
    id: serial("id").primaryKey(),
    opportunityId: integer("opportunity_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    stage: text("stage").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    publishedBy: text("published_by").notNull().default(""),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("participant_notification_events_idempotency_unique").on(table.idempotencyKey),
    index("participant_notification_events_status_created_idx").on(table.status, table.createdAt),
    index("participant_notification_events_opportunity_created_idx").on(table.opportunityId, table.createdAt),
  ],
);

export const participantNotificationsTable = pgTable(
  "participant_notifications",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => participantNotificationEventsTable.id, { onDelete: "cascade" }),
    opportunityId: integer("opportunity_id").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    stage: text("stage").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("participant_notifications_event_email_unique").on(table.eventId, table.recipientEmail),
    index("participant_notifications_email_created_idx").on(table.recipientEmail, table.createdAt),
  ],
);

export const participantNotificationDeliveriesTable = pgTable(
  "participant_notification_deliveries",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => participantNotificationEventsTable.id, { onDelete: "cascade" }),
    recipientEmail: text("recipient_email").notNull(),
    channel: text("channel").notNull(),
    targetKey: text("target_key").notNull(),
    pushSubscriptionId: integer("push_subscription_id"),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("participant_notification_deliveries_event_channel_target_unique")
      .on(table.eventId, table.channel, table.targetKey),
    index("participant_notification_deliveries_status_created_idx").on(table.status, table.createdAt),
    index("participant_notification_deliveries_event_status_idx").on(table.eventId, table.status),
  ],
);

export const participantNotificationPreferencesTable = pgTable(
  "participant_notification_preferences",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastAccessLinkSentAt: timestamp("last_access_link_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_notification_preferences_email_unique").on(table.email),
  ],
);

export const participantNotificationAccessTokensTable = pgTable(
  "participant_notification_access_tokens",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    purpose: text("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_notification_access_tokens_hash_unique").on(table.tokenHash),
    index("participant_notification_access_tokens_email_purpose_idx").on(table.email, table.purpose, table.createdAt),
    index("participant_notification_access_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const participantPushSubscriptionsTable = pgTable(
  "participant_push_subscriptions",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    endpoint: text("endpoint").notNull(),
    deviceLabel: text("device_label").notNull().default("Browser"),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_push_subscriptions_endpoint_unique").on(table.endpoint),
    index("participant_push_subscriptions_email_status_idx").on(table.email, table.status),
  ],
);

export type ParticipantNotificationEvent = typeof participantNotificationEventsTable.$inferSelect;
export type ParticipantNotification = typeof participantNotificationsTable.$inferSelect;
export type ParticipantNotificationDelivery = typeof participantNotificationDeliveriesTable.$inferSelect;
export type ParticipantNotificationPreferences = typeof participantNotificationPreferencesTable.$inferSelect;
export type ParticipantPushSubscription = typeof participantPushSubscriptionsTable.$inferSelect;
