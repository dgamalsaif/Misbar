import { coordinatorPortalSettingsTable, db, researchProgramsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getSiteContentSettings, sanitizeSiteContentSettings, SITE_CONTENT_KEY } from "./siteContentSettings";
import { findDuplicateOpportunity, opportunityLabel, PROGRAM_CATALOG_LOCK_ID, type OpportunityIdentity } from "./opportunityDuplicates";

export interface ResearchOpportunityImportRow {
  sourceRow?: number;
  category?: string;
  titleAr?: string;
  titleEn?: string;
  specialtyAr?: string;
  specialtyEn?: string;
  country?: string;
  applicationDeadline?: string;
  seatsLeft?: number | string;
  status?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  journalTarget?: string;
  journalIssn?: string;
  journalPubmed?: string;
  journalScopus?: string;
  journalWos?: string;
  indexedIn?: string;
  benefits?: string;
  duration?: string;
  supervisor?: string;
  priceOriginalSar?: number | string;
  priceDiscountedSar?: number | string;
}

type ImportDatabase = Pick<typeof db, "transaction">;

const TOTAL_SEATS = 15;
const PROGRAM_STATUSES = new Set([
  "open", "closed", "draft", "upcoming", "seats_full", "ethics_approved",
  "submitted", "under_review", "accepted", "published",
]);
const PROGRAM_CATEGORIES = new Set(["active", "completed", "training", "cme"]);

export async function importResearchOpportunities(rows: ResearchOpportunityImportRow[], database: ImportDatabase = db) {
  return database.transaction(async (tx) => {
    // This is intentionally the same transaction lock used by catalog bootstrap.
    // It serializes the read-and-insert operation, including a first catalog read.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${PROGRAM_CATALOG_LOCK_ID})`);
    const existing = await tx.select({
      id: researchProgramsTable.id,
      titleAr: researchProgramsTable.titleAr,
      titleEn: researchProgramsTable.titleEn,
      specialtyAr: researchProgramsTable.specialtyAr,
      specialtyEn: researchProgramsTable.specialtyEn,
    }).from(researchProgramsTable);
    const seenCandidates: Array<{ sourceRow: number; titleAr: string; titleEn: string; specialtyAr: string; specialtyEn: string }> = [];
    const rejected: Array<{
      row: number;
      reason: string;
      matchedOpportunity?: { id?: number; sourceRow?: number; title: string; specialty: string };
    }> = [];
    const values: Array<typeof researchProgramsTable.$inferInsert> = [];
    rows.forEach((row, index) => {
      const rowNumber = row.sourceRow || index + 2;
      const titleAr = text(row.titleAr);
      const titleEn = text(row.titleEn);
      const specialtyAr = text(row.specialtyAr);
      const specialtyEn = text(row.specialtyEn);
      const title = titleEn || titleAr;
      const country = text(row.country).slice(0, 120);
      const applicationDeadline = text(row.applicationDeadline);
      const seatsLeft = wholeNumber(row.seatsLeft, TOTAL_SEATS);
      if (!title || !specialtyAr || !specialtyEn) {
        rejected.push({ row: rowNumber, reason: "يلزم إدخال عنوان الفرصة والتخصص بالعربية والإنجليزية." });
        return;
      }
      if (seatsLeft === null) {
        rejected.push({ row: rowNumber, reason: "المقاعد المتبقية يجب أن تكون رقماً صحيحاً بين 0 و15." });
        return;
      }
      if (applicationDeadline && !isValidDateOnly(applicationDeadline)) {
        rejected.push({ row: rowNumber, reason: "موعد إغلاق التسجيل يجب أن يكون تاريخاً صحيحاً بصيغة YYYY-MM-DD." });
        return;
      }
      const candidate = {
        titleAr: titleAr || title,
        titleEn: titleEn || title,
        specialtyAr,
        specialtyEn,
      };
      const duplicate = findDuplicateOpportunity<OpportunityIdentity>(candidate, [...existing, ...seenCandidates]);
      if (duplicate) {
        const isFromFile = "sourceRow" in duplicate;
        const matchedOpportunity = {
          ...(duplicate.id ? { id: duplicate.id } : {}),
          ...(isFromFile && duplicate.sourceRow ? { sourceRow: duplicate.sourceRow } : {}),
          title: duplicate.titleAr || duplicate.titleEn || "",
          specialty: duplicate.specialtyAr || duplicate.specialtyEn || "",
        };
        const location = duplicate.id
          ? `الفرصة رقم ${duplicate.id}`
          : `الصف ${duplicate.sourceRow}`;
        rejected.push({
          row: rowNumber,
          reason: `تطابق العنوان والتخصص مع ${location}: ${opportunityLabel(duplicate)}.`,
          matchedOpportunity,
        });
        return;
      }
      seenCandidates.push({ ...candidate, sourceRow: rowNumber });
      const category = PROGRAM_CATEGORIES.has(text(row.category)) ? text(row.category) : "active";
      const status = seatsLeft === 0
        ? "seats_full"
        : PROGRAM_STATUSES.has(text(row.status)) ? text(row.status) : "open";
      const firstAuthorSeatsLeft = seatsLeft > 0 ? 1 : 0;
      const coAuthorSeatsLeft = Math.max(0, seatsLeft - firstAuthorSeatsLeft);
      const priceOriginalSar = nonNegativeAmount(row.priceOriginalSar, 1500);
      const priceDiscountedSar = nonNegativeAmount(row.priceDiscountedSar, 1000);
      values.push({
        category,
        ...candidate,
        country,
        applicationDeadline: applicationDeadline || null,
        descriptionAr: text(row.descriptionAr),
        descriptionEn: text(row.descriptionEn),
        seatsLeft,
        totalSeats: TOTAL_SEATS,
        firstAuthorSeats: 1,
        firstAuthorSeatsLeft,
        coAuthorSeats: 14,
        coAuthorSeatsLeft,
        status,
        journalTarget: text(row.journalTarget),
        journalIssn: text(row.journalIssn),
        journalPubmed: text(row.journalPubmed),
        journalScopus: text(row.journalScopus),
        journalWos: text(row.journalWos),
        indexedIn: pipeSeparated(row.indexedIn),
        benefits: pipeSeparated(row.benefits),
        duration: text(row.duration),
        supervisor: text(row.supervisor),
        priceOriginalSar: Math.max(priceOriginalSar, priceDiscountedSar),
        priceDiscountedSar,
      });
    });
    const inserted = values.length ? await tx.insert(researchProgramsTable).values(values).returning() : [];
    const insertedSpecialties = inserted.map((row) => ({ nameAr: row.specialtyAr, nameEn: row.specialtyEn }));
    return { inserted, rejected, insertedSpecialties, skipped: rows.length - values.length };
  });
}

export async function addImportedSpecialties(specialties: Array<{ nameAr: string; nameEn: string }>) {
  if (!specialties.length) return [];
  const settings = await getSiteContentSettings();
  const existing = new Set(settings.specialtyOptions.map((option) => `${option.nameAr.toLocaleLowerCase()}::${option.nameEn.toLocaleLowerCase()}`));
  const additions = specialties.flatMap((specialty) => {
    const nameAr = text(specialty.nameAr);
    const nameEn = text(specialty.nameEn);
    const key = `${nameAr.toLocaleLowerCase()}::${nameEn.toLocaleLowerCase()}`;
    if (!nameAr || !nameEn || existing.has(key) || settings.specialtyOptions.length + additions.length >= 100) return [];
    existing.add(key);
    return [{ id: `${nameAr}-${nameEn}`.slice(0, 80), nameAr, nameEn }];
  });
  if (!additions.length) return settings.specialtyOptions;
  const nextSettings = sanitizeSiteContentSettings({
    ...settings,
    specialtyOptions: [...settings.specialtyOptions, ...additions],
  });
  const settingsValue = nextSettings as unknown as Record<string, unknown>;
  await db.insert(coordinatorPortalSettingsTable).values({ key: SITE_CONTENT_KEY, value: settingsValue })
    .onConflictDoUpdate({ target: coordinatorPortalSettingsTable.key, set: { value: settingsValue, updatedAt: new Date() } });
  return nextSettings.specialtyOptions;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

function pipeSeparated(value: unknown) {
  return text(value).split(/[|،,]/).map((item) => item.trim()).filter(Boolean).join("|");
}

function wholeNumber(value: unknown, fallback: number): number | null {
  if (value === "" || value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= TOTAL_SEATS ? parsed : null;
}

function nonNegativeAmount(value: unknown, fallback: number) {
  if (value === "" || value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export { PROGRAM_CATALOG_LOCK_ID };