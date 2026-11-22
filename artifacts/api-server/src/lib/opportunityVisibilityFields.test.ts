import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateHiddenFields, validateIncludedServices } from "./opportunityVisibilityFields";

test("title and preview are valid owner-controlled public fields", () => {
  assert.deepEqual(validateHiddenFields(["title", "specialty", "preview"]), ["title", "specialty", "preview"]);
  assert.throws(() => validateHiddenFields(["unknown"]));
});

test("included service descriptions are trimmed, deduplicated, and bounded", () => {
  assert.deepEqual(validateIncludedServices([" الإشراف البحثي ", "التحليل الإحصائي", "الإشراف البحثي", ""]), [
    "الإشراف البحثي",
    "التحليل الإحصائي",
  ]);
  assert.throws(() => validateIncludedServices(["x".repeat(201)]));
  assert.throws(() => validateIncludedServices(Array.from({ length: 21 }, () => "خدمة")));
});
