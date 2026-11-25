export interface CatalogVisibilityRecord {
  id: number;
  category: string;
  status: string;
}

export function isPublicProgram(program: CatalogVisibilityRecord, isArchived = false) {
  return !isArchived && ["active", "completed"].includes(program.category) && program.status !== "draft";
}

export function filterVisiblePrograms<T extends CatalogVisibilityRecord>(
  programs: T[],
  archivedIds: Set<number>,
  isStaff: boolean,
  isOwner: boolean,
): T[] {
  if (isOwner) return programs;
  return programs.filter((program) => !archivedIds.has(program.id) && (isStaff || isPublicProgram(program)));
}
