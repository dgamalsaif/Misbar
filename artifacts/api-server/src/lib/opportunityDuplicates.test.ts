import assert from "node:assert/strict";
import { test } from "node:test";
import {
  areDuplicateOpportunities,
  findDuplicateOpportunity,
  groupDuplicateOpportunities,
  normalizeOpportunityText,
} from "./opportunityDuplicates";
import { importResearchOpportunities, type ResearchOpportunityImportRow } from "./researchOpportunityImport";
import { filterVisiblePrograms } from "./programCatalogVisibility";

const arabicOpportunity = {
  id: 1,
  titleAr: "أبحاثُ القلب ــ لدى البالغين",
  titleEn: "Cardiac outcomes in adults",
  specialtyAr: "طِبّ القَلب",
  specialtyEn: "Cardiology",
};

test("normalizes Arabic marks, tatweel, spacing and Latin case before matching", () => {
  assert.equal(normalizeOpportunityText("أ  بــحاث"), "ابحاث");
  assert.equal(
    areDuplicateOpportunities(arabicOpportunity, {
      id: 2,
      titleAr: "ابحاث القلب لدى البالغين",
      titleEn: "  CARDIAC   OUTCOMES IN ADULTS ",
      specialtyAr: "طب القلب",
      specialtyEn: "CARDIOLOGY",
    }),
    true,
  );
});

test("does not call the same title a duplicate when its specialty differs", () => {
  assert.equal(
    areDuplicateOpportunities(arabicOpportunity, {
      id: 3,
      titleAr: arabicOpportunity.titleAr,
      titleEn: arabicOpportunity.titleEn,
      specialtyAr: "جراحة القلب",
      specialtyEn: "Cardiac Surgery",
    }),
    false,
  );
});

test("returns a stable existing match, supports self-exclusion and groups connected duplicates", () => {
  const records = [
    arabicOpportunity,
    { ...arabicOpportunity, id: 8, titleAr: "ابحاث القلب لدى البالغين" },
    { ...arabicOpportunity, id: 4, titleEn: "CARDIAC OUTCOMES IN ADULTS" },
  ];
  assert.equal(findDuplicateOpportunity(records[0]!, records.slice(1))?.id, 4);
  assert.equal(findDuplicateOpportunity(records[0]!, records, 1)?.id, 4);
  assert.equal(groupDuplicateOpportunities(records).length, 1);
});

const importRow = (titleAr = "بحث القلب", titleEn = "Cardiology study"): ResearchOpportunityImportRow => ({
  titleAr,
  titleEn,
  specialtyAr: "طب القلب",
  specialtyEn: "Cardiology",
  seatsLeft: 15,
});

function createTransactionalCatalog() {
  const programs: Array<Record<string, unknown>> = [];
  let nextId = 1;
  let lockTail: Promise<void> = Promise.resolve();

  const database = {
    async transaction<T>(callback: (tx: unknown) => Promise<T>) {
      let release: () => void = () => undefined;
      const previous = lockTail;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      lockTail = previous.then(() => gate);
      const tx = {
        execute: async () => {
          await previous;
          return [];
        },
        select: () => ({
          from: async () => programs.map((program) => ({ ...program })),
        }),
        insert: () => ({
          values: (values: Array<Record<string, unknown>>) => ({
            returning: async () => values.map((value) => {
              const inserted = { id: nextId++, ...value };
              programs.push(inserted);
              return { ...inserted };
            }),
          }),
        }),
      };
      try {
        return await callback(tx);
      } finally {
        release();
      }
    },
  };
  return { database: database as never, programs };
}

test("repeated Excel import is idempotent and reports the matching saved opportunity", async () => {
  const catalog = createTransactionalCatalog();
  const first = await importResearchOpportunities([importRow()], catalog.database);
  const second = await importResearchOpportunities([importRow("بحثُ القلب", " CARDIOLOGY STUDY ")], catalog.database);
  assert.equal(first.inserted.length, 1);
  assert.equal(second.inserted.length, 0);
  assert.equal(second.rejected[0]?.matchedOpportunity?.id, 1);
  assert.match(second.rejected[0]?.reason || "", /الفرصة رقم 1/);
  assert.equal(catalog.programs.length, 1);
});

test("simultaneous imports of the same row serialize and insert only once", async () => {
  const catalog = createTransactionalCatalog();
  const results = await Promise.all([
    importResearchOpportunities([importRow()], catalog.database),
    importResearchOpportunities([importRow()], catalog.database),
  ]);
  assert.equal(results.reduce((total, result) => total + result.inserted.length, 0), 1);
  assert.equal(results.reduce((total, result) => total + result.rejected.length, 0), 1);
  assert.equal(catalog.programs.length, 1);
});

test("duplicates within one import file identify the first matching row", async () => {
  const catalog = createTransactionalCatalog();
  const result = await importResearchOpportunities([
    { ...importRow(), sourceRow: 2 },
    { ...importRow("بحث القلب", "CARDIOLOGY   STUDY"), sourceRow: 7 },
  ], catalog.database);
  assert.equal(result.inserted.length, 1);
  assert.equal(result.rejected[0]?.matchedOpportunity?.sourceRow, 2);
  assert.match(result.rejected[0]?.reason || "", /الصف 2/);
});

test("public and coordinator catalogs omit archived opportunities while the owner can review them", () => {
  const programs = [
    { id: 1, category: "active", status: "open" },
    { id: 2, category: "active", status: "open" },
    { id: 3, category: "active", status: "draft" },
  ];
  const archived = new Set([2]);
  assert.deepEqual(filterVisiblePrograms(programs, archived, false, false).map((program) => program.id), [1]);
  assert.deepEqual(filterVisiblePrograms(programs, archived, true, false).map((program) => program.id), [1, 3]);
  assert.deepEqual(filterVisiblePrograms(programs, archived, true, true).map((program) => program.id), [1, 2, 3]);
});
