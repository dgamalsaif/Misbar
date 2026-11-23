import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const socialSeatUpdateEventsTable = pgTable("social_seat_update_events", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").notNull(),
  opportunityId: integer("opportunity_id").notNull(),
  seatsLeft: integer("seats_left").notNull(),
  totalSeats: integer("total_seats").notNull(),
  firstAuthorSeatsLeft: integer("first_author_seats_left").notNull(),
  coAuthorSeatsLeft: integer("co_author_seats_left").notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("social_seat_update_events_registration_unique").on(table.registrationId),
  index("social_seat_update_events_status_created_idx").on(table.status, table.createdAt),
  index("social_seat_update_events_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

export const socialSeatUpdateDeliveriesTable = pgTable("social_seat_update_deliveries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  platform: text("platform").notNull(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  status: text("status").notNull().default("publishing"),
  content: text("content").notNull(),
  externalPostId: text("external_post_id").notNull().default(""),
  lastError: text("last_error").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("social_seat_update_deliveries_event_account_unique").on(table.eventId, table.platform, table.accountId),
  index("social_seat_update_deliveries_event_status_idx").on(table.eventId, table.status),
]);

export type SocialSeatUpdateEvent = typeof socialSeatUpdateEventsTable.$inferSelect;
export type SocialSeatUpdateDelivery = typeof socialSeatUpdateDeliveriesTable.$inferSelect;
