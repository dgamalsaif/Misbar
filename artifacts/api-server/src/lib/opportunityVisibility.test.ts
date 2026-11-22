import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getOpportunityIncludedServices, getOpportunityVisibility, saveOpportunityIncludedServices, saveOpportunityVisibility } from "./opportunityVisibility";

test("per-opportunity visibility writes remain independent of other opportunities and site settings", async () => {
  // In-memory query doubles only; never connect to or modify the project's database.
  const siteSettings = { brand: { opportunityInquiryChannel: "email" }, showOpportunityDetails: true };
  const records = new Map<string, Record<string, unknown>>([["site_content", siteSettings]]);
  const transaction = {
    insert: () => ({
      values: (record: { key: string; value: Record<string, unknown> }) => ({
        onConflictDoUpdate: async () => { records.set(record.key, record.value); },
      }),
    }),
  };
  const transactionDouble = transaction as unknown as Parameters<typeof saveOpportunityVisibility>[0];
  await saveOpportunityVisibility(transactionDouble, 1, ["seats", "price"]);
  await saveOpportunityVisibility(transactionDouble, 2, ["description"]);
  assert.deepEqual(records.get("opportunity_display:1"), { hiddenFields: ["seats", "price"], visibilityVersion: 2 });
  assert.deepEqual(records.get("opportunity_display:2"), { hiddenFields: ["description"], visibilityVersion: 2 });
  await saveOpportunityIncludedServices(transactionDouble, 1, ["الإشراف البحثي", "التحليل الإحصائي"]);
  assert.deepEqual(records.get("opportunity_services:1"), { includedServices: ["الإشراف البحثي", "التحليل الإحصائي"] });
  await saveOpportunityVisibility(transactionDouble, 1, []);
  assert.deepEqual(records.get("opportunity_display:1"), { hiddenFields: [], visibilityVersion: 2 });
  assert.deepEqual(records.get("opportunity_display:2"), { hiddenFields: ["description"], visibilityVersion: 2 });
  assert.equal(records.get("site_content"), siteSettings);

  const reader = {
    select: () => ({
      from: () => ({
        where: async () => [...records].filter(([key]) => key.startsWith("opportunity_"))
          .map(([key, value]) => ({ key, value })),
      }),
    }),
  };
  const readerDouble = reader as unknown as NonNullable<Parameters<typeof getOpportunityVisibility>[1]>;
  const loaded = await getOpportunityVisibility([1, 2], readerDouble);
  assert.deepEqual(loaded.get(1), []);
  assert.deepEqual(loaded.get(2), ["description"]);
  assert.equal(loaded.get(3), undefined);
  assert.equal((await getOpportunityVisibility([], readerDouble)).size, 0);
  const services = await getOpportunityIncludedServices([1, 2], readerDouble);
  assert.deepEqual(services.get(1), ["الإشراف البحثي", "التحليل الإحصائي"]);
  assert.deepEqual(services.get(2), []);
});

test("legacy visibility settings hide sensitive fields until explicitly configured", async () => {
  const reader = {
    select: () => ({
      from: () => ({
        where: async () => [{ key: "opportunity_display:7", value: { hiddenFields: ["price"] } }],
      }),
    }),
  };
  const readerDouble = reader as unknown as NonNullable<Parameters<typeof getOpportunityVisibility>[1]>;
  const loaded = await getOpportunityVisibility([7, 8], readerDouble);
  assert.deepEqual(loaded.get(7), ["price", "title", "specialty", "preview"]);
  assert.deepEqual(loaded.get(8), ["title", "specialty", "preview"]);
});