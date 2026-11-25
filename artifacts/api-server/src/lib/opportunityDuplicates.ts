export const PROGRAM_CATALOG_LOCK_ID = 902173;

export interface OpportunityIdentity {
  id?: number;
  sourceRow?: number;
  title?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  specialty?: string | null;
  specialtyAr?: string | null;
  specialtyEn?: string | null;
}

export function normalizeOpportunityText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, "");
}

function normalizedValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map(normalizeOpportunityText).filter(Boolean))];
}

function identityKeys(opportunity: OpportunityIdentity): string[] {
  const titles = normalizedValues([opportunity.titleAr, opportunity.titleEn, opportunity.title]);
  if (!titles.length) return [];
  const specialties = normalizedValues([opportunity.specialtyAr, opportunity.specialtyEn, opportunity.specialty]);
  const specialtyValues = specialties.length ? specialties : [""];
  return [...new Set(titles.flatMap((title) => specialtyValues.map((specialty) => `${title}\u0000${specialty}`)))];
}

export function areDuplicateOpportunities(left: OpportunityIdentity, right: OpportunityIdentity): boolean {
  const rightKeys = new Set(identityKeys(right));
  return identityKeys(left).some((key) => rightKeys.has(key));
}

export function findDuplicateOpportunity<T extends OpportunityIdentity>(
  candidate: OpportunityIdentity,
  existing: T[],
  excludeId?: number,
): T | undefined {
  return existing
    .filter((item) => excludeId === undefined || item.id !== excludeId)
    .sort((a, b) => (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER))
    .find((item) => areDuplicateOpportunities(candidate, item));
}

export function groupDuplicateOpportunities<T extends OpportunityIdentity>(opportunities: T[]): T[][] {
  const parents = opportunities.map((_, index) => index);
  const findRoot = (index: number): number => {
    if (parents[index] !== index) parents[index] = findRoot(parents[index]!);
    return parents[index]!;
  };
  const union = (left: number, right: number) => {
    const leftRoot = findRoot(left);
    const rightRoot = findRoot(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };
  const firstByKey = new Map<string, number>();

  opportunities.forEach((opportunity, index) => {
    for (const key of identityKeys(opportunity)) {
      const firstIndex = firstByKey.get(key);
      if (firstIndex === undefined) firstByKey.set(key, index);
      else union(index, firstIndex);
    }
  });

  const groups = new Map<number, T[]>();
  opportunities.forEach((opportunity, index) => {
    const root = findRoot(index);
    const group = groups.get(root) ?? [];
    group.push(opportunity);
    groups.set(root, group);
  });

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
    .sort((a, b) => (a[0]?.id ?? 0) - (b[0]?.id ?? 0));
}

export function opportunityLabel(opportunity: OpportunityIdentity): string {
  const title = opportunity.titleAr || opportunity.titleEn || opportunity.title || "فرصة بلا عنوان";
  const specialty = opportunity.specialtyAr || opportunity.specialtyEn || opportunity.specialty || "دون تخصص";
  return `${title} — ${specialty}`;
}
