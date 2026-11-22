import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { getEnglishOpportunityTitle } from "./opportunityDisplay";
import { DEFAULT_SITE_CONTENT_SETTINGS, sanitizeSiteContentSettings } from "./siteContentSettings";

after(async () => { await pool?.end(); });

test("opportunity titles use English, including legacy English titles", () => {
  assert.equal(getEnglishOpportunityTitle({ id: 128, titleEn: " English study ", titleAr: "دراسة" }), "English study");
  assert.equal(getEnglishOpportunityTitle({ id: 128, titleEn: "", titleAr: "Legacy English study" }), "Legacy English study");
  assert.equal(getEnglishOpportunityTitle({ id: 128, titleEn: "دراسة", titleAr: "دراسة" }), "Research Opportunity RES-2026-128");
});

test("the global details setting preserves false and true through JSON saves", () => {
  for (const showOpportunityDetails of [false, true]) {
    const saved = sanitizeSiteContentSettings({ ...DEFAULT_SITE_CONTENT_SETTINGS, showOpportunityDetails });
    const loaded = sanitizeSiteContentSettings(JSON.parse(JSON.stringify(saved)));
    assert.equal(loaded.showOpportunityDetails, showOpportunityDetails);
  }
  assert.equal(sanitizeSiteContentSettings({}).showOpportunityDetails, true);
  assert.equal(sanitizeSiteContentSettings({ showOpportunityDetails: "false" }).showOpportunityDetails, true);
});

test("participant opportunity filter visibility survives saved-settings normalization", () => {
  const saved = sanitizeSiteContentSettings({
    opportunityFilterVisibility: { searchBySpecialty: false, country: true, price: false },
  });
  const loaded = sanitizeSiteContentSettings(JSON.parse(JSON.stringify(saved)));

  assert.deepEqual(loaded.opportunityFilterVisibility, {
    searchBySpecialty: false,
    country: true,
    seats: true,
    deadline: true,
    price: false,
  });
  assert.equal(sanitizeSiteContentSettings({}).opportunityFilterVisibility.searchBySpecialty, true);
});

test("old title-language settings cannot bring back Arabic research titles", () => {
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.participantTitleLanguage, "english");
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.coordinatorTitleLanguage, "english");
  const settings = sanitizeSiteContentSettings({
    ...DEFAULT_SITE_CONTENT_SETTINGS,
    participantTitleLanguage: "both",
    coordinatorTitleLanguage: "arabic",
  });
  assert.equal(settings.participantTitleLanguage, "english");
  assert.equal(settings.coordinatorTitleLanguage, "english");
  assert.equal(settings.brand.siteNameAr, DEFAULT_SITE_CONTENT_SETTINGS.brand.siteNameAr);
});

test("app icon dimensions persist within the supported display range", () => {
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.brand.appIconDisplaySize, 72);
  assert.equal(sanitizeSiteContentSettings({ brand: { appIconDisplaySize: 88 } }).brand.appIconDisplaySize, 88);
  assert.equal(sanitizeSiteContentSettings({ brand: { appIconDisplaySize: 200 } }).brand.appIconDisplaySize, 100);
  assert.equal(sanitizeSiteContentSettings({ brand: { appIconDisplaySize: 12 } }).brand.appIconDisplaySize, 30);
});

test("country and WhatsApp fields stay enabled and required after loading saved settings", () => {
  const savedFields = DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.map((field) =>
    field.id === "country" || field.id === "whatsapp"
      ? { ...field, showParticipant: false, showCoordinator: false, requiredParticipant: false, requiredCoordinator: false }
      : field.id === "city"
        ? { ...field, placeholder: "ضع مفتاح الدولة هنا", placeholderEn: "County Code" }
        : field
  );
  const loaded = sanitizeSiteContentSettings({ registrationFields: savedFields });
  const fields = Object.fromEntries(loaded.registrationFields.map((field) => [field.id, field]));

  for (const id of ["country", "whatsapp"] as const) {
    assert.equal(fields[id].showParticipant, true);
    assert.equal(fields[id].showCoordinator, true);
    assert.equal(fields[id].requiredParticipant, true);
    assert.equal(fields[id].requiredCoordinator, true);
  }
  assert.equal(fields.city.placeholder, "الرياض");
  assert.equal(fields.city.placeholderEn, "Riyadh");
});

test("invoice settings persist as unpaid and reject unsafe image links", () => {
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.invoiceSettings.enabled, true);
  assert.match(DEFAULT_SITE_CONTENT_SETTINGS.invoiceSettings.titleAr, /غير مدفوعة/);
  const saved = sanitizeSiteContentSettings({
    invoiceSettings: {
      enabled: false,
      titleAr: "فاتورة المشاركة",
      numberPrefix: "MI!SBAR 2026",
      logoUrl: "javascript:alert(1)",
      stampUrl: "/api/site-brand-logo/11111111-1111-4111-8111-111111111111",
    },
  });
  const loaded = sanitizeSiteContentSettings(JSON.parse(JSON.stringify(saved)));

  assert.equal(loaded.invoiceSettings.enabled, false);
  assert.equal(loaded.invoiceSettings.titleAr, "فاتورة المشاركة");
  assert.equal(loaded.invoiceSettings.numberPrefix, "MISBAR2026");
  assert.equal(loaded.invoiceSettings.logoUrl, "");
  assert.equal(loaded.invoiceSettings.stampUrl, "/api/site-brand-logo/11111111-1111-4111-8111-111111111111");
  assert.match(loaded.invoiceSettings.applicabilityNoteAr, /الترقية/);
});

test("watermark settings persist while invalid visual values use safe defaults", () => {
  const saved = sanitizeSiteContentSettings({
    watermarkSettings: {
      enabled: false,
      textAr: "مسبار خاص",
      textEn: "MISBAR",
      color: "red",
      opacity: -1,
      fontSize: 2,
      angle: 90,
    },
  });
  const loaded = sanitizeSiteContentSettings(JSON.parse(JSON.stringify(saved)));
  assert.equal(loaded.watermarkSettings.enabled, false);
  assert.equal(loaded.watermarkSettings.textAr, "مسبار خاص");
  assert.equal(loaded.watermarkSettings.textEn, "MISBAR");
  assert.equal(loaded.watermarkSettings.color, DEFAULT_SITE_CONTENT_SETTINGS.watermarkSettings.color);
  assert.equal(loaded.watermarkSettings.opacity, 0.03);
  assert.equal(loaded.watermarkSettings.fontSize, 8);
  assert.equal(loaded.watermarkSettings.angle, 45);
});