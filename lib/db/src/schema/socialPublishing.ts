import { jsonb, integer, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export type SocialConnectionMetadata = Record<string, string | number | boolean | null>;

export const socialConnectionsTable = pgTable("social_connections", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull().default(""),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").$type<SocialConnectionMetadata>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("social_connections_platform_account_unique").on(table.platform, table.accountId),
  index("social_connections_platform_status_idx").on(table.platform, table.status),
]);

export const socialPostRecordsTable = pgTable("social_post_records", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  platform: text("platform").notNull(),
  accountId: text("account_id").notNull(),
  accountName: text("account_name").notNull(),
  status: text("status").notNull().default("publishing"),
  content: text("content").notNull(),
  externalPostId: text("external_post_id").notNull().default(""),
  lastError: text("last_error").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("social_post_records_opportunity_account_unique").on(table.opportunityId, table.platform, table.accountId),
  index("social_post_records_opportunity_idx").on(table.opportunityId, table.createdAt),
]);

export type SocialConnection = typeof socialConnectionsTable.$inferSelect;
export type SocialPostRecord = typeof socialPostRecordsTable.$inferSelect;
