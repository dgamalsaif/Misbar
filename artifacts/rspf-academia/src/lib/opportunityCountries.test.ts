import { strict as assert } from "node:assert";
import { test } from "node:test";
import { localizeOpportunityCountry, OPPORTUNITY_COUNTRIES } from "./opportunityCountries";

test("opportunity country choices cover every ISO 3166-1 alpha-2 code once", () => {
  const codes = OPPORTUNITY_COUNTRIES.map((country) => country.isoCode);
  assert.equal(codes.length, 249);
  assert.equal(new Set(codes).size, 249);
  assert.ok(OPPORTUNITY_COUNTRIES.every((country) => country.name && country.nameEn && country.flag));
});

test("opportunity country names can be localized from saved Arabic or English values", () => {
  const saudi = OPPORTUNITY_COUNTRIES.find((country) => country.isoCode === "SA");
  assert.ok(saudi);
  assert.equal(localizeOpportunityCountry(saudi.name, "en"), saudi.nameEn);
  assert.equal(localizeOpportunityCountry(saudi.nameEn, "ar"), saudi.name);
  assert.equal(localizeOpportunityCountry("فلسطين", "en"), "Palestine");
  assert.equal(localizeOpportunityCountry("Turkey", "ar"), "تركيا");
  assert.equal(localizeOpportunityCountry("unlisted legacy place", "en"), "unlisted legacy place");
});
