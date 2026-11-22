import { coordinatorPortalSettingsTable, db } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { DEFAULT_HIDDEN_OPPORTUNITY_FIELDS, validateHiddenFields, validateIncludedServices } from "./opportunityVisibilityFields";
export { validateHiddenFields } from "./opportunityVisibilityFields";

const keyFor = (id: number) => `opportunity_display:${id}`;
const servicesKeyFor = (id: number) => `opportunity_services:${id}`;

export async function getOpportunityVisibility(ids: number[], reader: Pick<typeof db, "select"> = db): Promise<Map<number, string[]>> {
  if (!ids.length) return new Map<number, string[]>();
  const records: Array<{ key: string; value: Record<string, unknown> }> = await reader.select().from(coordinatorPortalSettingsTable)
    .where(inArray(coordinatorPortalSettingsTable.key, ids.map(keyFor)));
  const byId = new Map(records.map((record) => [
    Number(record.key.slice("opportunity_display:".length)),
    record.value,
  ]));
  return new Map(ids.map((id) => {
    const value = byId.get(id);
    const hiddenFields = Array.isArray(value?.hiddenFields)
      ? value.hiddenFields.filter((field): field is string =>
        typeof field === "string" && (["title", "preview", "image", "code", "specialty", "status", "description", "price", "journal", "indexedIn", "duration", "supervisor", "createdAt", "seats", "benefits"] as string[]).includes(field))
      : [];
    // Existing records predate explicit title/privacy switches. Keep their
    // other choices, but require the owner to opt in before publishing titles.
    if (value?.visibilityVersion !== 2) {
      for (const field of DEFAULT_HIDDEN_OPPORTUNITY_FIELDS) {
        if (!hiddenFields.includes(field)) hiddenFields.push(field);
      }
    }
    return [id, hiddenFields];
  }));
}

export async function saveOpportunityVisibility(tx: Pick<typeof db, "insert">, id: number, hiddenFields: string[]) {
  await tx.insert(coordinatorPortalSettingsTable).values({ key: keyFor(id), value: { hiddenFields, visibilityVersion: 2 } })
    .onConflictDoUpdate({
      target: coordinatorPortalSettingsTable.key,
      set: { value: { hiddenFields, visibilityVersion: 2 }, updatedAt: new Date() },
    });
}

export async function getOpportunityIncludedServices(ids: number[], reader: Pick<typeof db, "select"> = db): Promise<Map<number, string[]>> {
  if (!ids.length) return new Map<number, string[]>();
  const keys = ids.map(servicesKeyFor);
  const records: Array<{ key: string; value: Record<string, unknown> }> = await reader.select().from(coordinatorPortalSettingsTable)
    .where(inArray(coordinatorPortalSettingsTable.key, keys));
  return new Map(ids.map((id) => {
    const record = records.find((item) => item.key === servicesKeyFor(id));
    let services: string[] = [];
    try { services = validateIncludedServices(record?.value.includedServices ?? []); } catch {}
    return [id, services];
  }));
}

export async function saveOpportunityIncludedServices(tx: Pick<typeof db, "insert">, id: number, includedServices: string[]) {
  const value = { includedServices: validateIncludedServices(includedServices) };
  await tx.insert(coordinatorPortalSettingsTable).values({ key: servicesKeyFor(id), value })
    .onConflictDoUpdate({
      target: coordinatorPortalSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}