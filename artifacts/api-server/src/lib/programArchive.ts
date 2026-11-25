import { db, researchProgramArchiveRecordsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "./programCapacity";

export type ProgramArchiveState = {
  available: boolean;
  byResearchId: Map<number, typeof researchProgramArchiveRecordsTable.$inferSelect>;
};

export async function getProgramArchiveState(tx: DatabaseTransaction = db): Promise<ProgramArchiveState> {
  const result = await tx.execute(sql`
    SELECT to_regclass('public.research_program_archive_records') IS NOT NULL AS available
  `);
  const available = Boolean((result as { rows?: Array<{ available?: boolean }> }).rows?.[0]?.available);
  if (!available) return { available: false, byResearchId: new Map() };

  const records = await tx.select().from(researchProgramArchiveRecordsTable)
    .where(eq(researchProgramArchiveRecordsTable.isArchived, true));
  return {
    available: true,
    byResearchId: new Map(records.map((record) => [record.researchId, record])),
  };
}

export async function isProgramArchived(researchId: number, tx: DatabaseTransaction = db) {
  const state = await getProgramArchiveState(tx);
  return state.byResearchId.has(researchId);
}
