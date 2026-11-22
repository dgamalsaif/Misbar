import type { ResearchOpportunity } from "./researchData";
import { isFieldVisible } from "./opportunityVisibility";

export type OpportunityFeeFilter = "all" | "free" | "paid";

export interface OpportunitySearchFilters {
  query: string;
  fee: OpportunityFeeFilter;
  minimumSeats: number | null;
  country: string | null;
  deadlineWithinDays: number | null;
  includeDetails?: boolean;
}

export function filterOpportunities(
  opportunities: ResearchOpportunity[],
  filters: OpportunitySearchFilters,
  today = getLocalDateOnly(),
): ResearchOpportunity[] {
  const query = normalizeSearchText(filters.query);

  return opportunities.filter((opportunity) => {
    if (query && !getVisibleSearchText(opportunity, filters.includeDetails !== false).some((value) => normalizeSearchText(value).includes(query))) {
      return false;
    }

    if (filters.country) {
      if (!isFieldVisible(opportunity, "country") ||
          normalizeSearchText(opportunity.country || "") !== normalizeSearchText(filters.country)) return false;
    }

    if (filters.fee !== "all") {
      if (!isFieldVisible(opportunity, "price")) return false;
      const price = Number(opportunity.priceDiscountedSar ?? opportunity.priceOriginalSar ?? 0);
      if (filters.fee === "free" && price > 0) return false;
      if (filters.fee === "paid" && price <= 0) return false;
    }

    if (filters.minimumSeats !== null) {
      if (!isFieldVisible(opportunity, "seats") || opportunity.seatsLeft < filters.minimumSeats) return false;
    }

    if (filters.deadlineWithinDays !== null) {
      if (!isFieldVisible(opportunity, "deadline") || !opportunity.applicationDeadline) return false;
      const daysUntilDeadline = dateDifferenceInDays(opportunity.applicationDeadline, today);
      if (daysUntilDeadline === null || daysUntilDeadline < 0 || daysUntilDeadline > filters.deadlineWithinDays) return false;
    }

    return true;
  });
}

function getVisibleSearchText(opportunity: ResearchOpportunity, includeDetails: boolean): string[] {
  const values: string[] = [];
  if (isFieldVisible(opportunity, "title")) values.push(opportunity.title, opportunity.titleAr || "", opportunity.titleEn || "");
  if (!includeDetails) return values.filter(Boolean);
  if (isFieldVisible(opportunity, "specialty")) values.push(opportunity.specialty, opportunity.specialtyAr || "", opportunity.specialtyEn || "");
  if (isFieldVisible(opportunity, "description")) values.push(opportunity.description, opportunity.descriptionAr || "", opportunity.descriptionEn || "");
  if (isFieldVisible(opportunity, "journal")) values.push(opportunity.journalTarget, opportunity.journalIssn || "");
  if (isFieldVisible(opportunity, "supervisor")) values.push(opportunity.supervisor);
  if (isFieldVisible(opportunity, "indexedIn")) values.push(...opportunity.indexedIn);
  if (isFieldVisible(opportunity, "duration")) values.push(opportunity.duration);
  if (isFieldVisible(opportunity, "country")) values.push(opportunity.country || "");
  if (isFieldVisible(opportunity, "deadline")) values.push(opportunity.applicationDeadline || "");
  return values.filter(Boolean);
}

function dateDifferenceInDays(value: string, today: string): number | null {
  if (!isDateOnly(value) || !isDateOnly(today)) return null;
  const deadline = Date.parse(`${value}T00:00:00.000Z`);
  const currentDate = Date.parse(`${today}T00:00:00.000Z`);
  return Math.floor((deadline - currentDate) / 86_400_000);
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getLocalDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
