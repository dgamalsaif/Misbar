import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { researchProgramsTable } from "./submissions";

export const researchProgramArchiveRecordsTable = pgTable("research_program_archive_records", {
  researchId: integer("research_id").primaryKey().references(() => researchProgramsTable.id, { onDelete: "cascade" }),
  canonicalResearchId: integer("canonical_research_id").notNull(),
  previousStatus: text("previous_status").notNull(),
  isArchived: boolean("is_archived").notNull().default(true),
  archivedAt: timestamp("archived_at").notNull().defaultNow(),
  archivedBy: text("archived_by").notNull(),
  restoredAt: timestamp("restored_at"),
  restoredBy: text("restored_by"),
});
