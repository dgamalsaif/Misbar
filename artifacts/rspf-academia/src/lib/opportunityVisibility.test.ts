import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getPublicImageUrl, isFieldVisible, normalizeHiddenFields } from "./opportunityVisibility";

test("display switches are independent and default to showing information", () => {
  assert.equal(isFieldVisible({}, "description"), true);
  const opportunity = { hiddenFields: ["description", "price"], imageUrl: "/api/programs/1/poster.svg?v=2" };
  assert.equal(isFieldVisible(opportunity, "description"), false);
  assert.equal(isFieldVisible(opportunity, "price"), false);
  assert.equal(isFieldVisible(opportunity, "image"), true);
  assert.equal(isFieldVisible(opportunity, "specialty"), true);
  assert.equal(isFieldVisible(opportunity, "country"), true);
  assert.equal(isFieldVisible(opportunity, "deadline"), true);
  assert.equal(isFieldVisible({ hiddenFields: ["country", "deadline"] }, "country"), false);
  assert.equal(isFieldVisible({ hiddenFields: ["country", "deadline"] }, "deadline"), false);
  assert.equal(getPublicImageUrl(opportunity), opportunity.imageUrl);
  assert.equal(getPublicImageUrl({ ...opportunity, hiddenFields: ["image"] }), undefined);
  assert.equal(getPublicImageUrl({ ...opportunity, hiddenFields: ["title"] }), undefined);
  assert.deepEqual(normalizeHiddenFields(["price", "price", "unknown"]), ["price"]);
});

test("new opportunities hide title, specialty, and preview until the owner enables them", () => {
  const defaults = normalizeHiddenFields(undefined);
  assert.equal(isFieldVisible({ hiddenFields: defaults }, "title"), false);
  assert.equal(isFieldVisible({ hiddenFields: defaults }, "specialty"), false);
  assert.equal(isFieldVisible({ hiddenFields: defaults }, "preview"), false);
  assert.equal(isFieldVisible({ hiddenFields: defaults }, "price"), true);
});