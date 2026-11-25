import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DEFAULT_SITE_CONTENT_SETTINGS,
  getPwaIconUrl,
  getOrderedRegistrationFields,
  normalizeSiteContentSettings,
  type RegistrationFieldSetting,
} from "./siteContentSettings";

test("registration fields follow the admin-configured order and missing defaults are appended", () => {
  const defaults = DEFAULT_SITE_CONTENT_SETTINGS.registrationFields;
  const reordered = [defaults[3], defaults[0], defaults[5]];
  const ordered = getOrderedRegistrationFields({ registrationFields: reordered });

  assert.equal(ordered[0].id, "affiliation");
  assert.equal(ordered[1].id, "fullName");
  const contactStart = ordered.findIndex((field) => field.id === "country");
  assert.deepEqual(ordered.slice(contactStart, contactStart + 3).map((field) => field.id), ["country", "city", "whatsapp"]);
  // every default field still renders exactly once
  assert.equal(ordered.length, defaults.length);
  for (const field of defaults) {
    assert.equal(ordered.filter((f) => f.id === field.id).length, 1);
  }
});

test("country and WhatsApp stay visible and required for both audiences", () => {
  const configured = DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.map((field) =>
    field.id === "country" || field.id === "whatsapp"
      ? { ...field, showParticipant: false, showCoordinator: false, requiredParticipant: false, requiredCoordinator: false }
      : field.id === "city"
        ? { ...field, placeholder: "ضع مفتاح الدولة هنا", placeholderEn: "County Code" }
        : field
  );
  const settings = normalizeSiteContentSettings({ registrationFields: configured });
  const fields = Object.fromEntries(settings.registrationFields.map((field) => [field.id, field]));

  for (const id of ["country", "whatsapp"] as const) {
    assert.equal(fields[id].showParticipant, true);
    assert.equal(fields[id].showCoordinator, true);
    assert.equal(fields[id].requiredParticipant, true);
    assert.equal(fields[id].requiredCoordinator, true);
  }
  assert.equal(fields.city.placeholder, "الرياض");
  assert.equal(fields.city.placeholderEn, "Riyadh");
});

test("legacy manual country-code instructions are removed from the country field", () => {
  const configured = DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.map((field) =>
    field.id === "country"
      ? { ...field, placeholder: "قم بحذف مفتاح الدولة وضع مفتاح الدولة الخاصة بك", placeholderEn: "Delete the country code and enter your own country code." }
      : field
  );
  const country = normalizeSiteContentSettings({ registrationFields: configured }).registrationFields.find((field) => field.id === "country");
  const defaultCountry = DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.find((field) => field.id === "country");

  assert.equal(country?.placeholder, defaultCountry?.placeholder);
  assert.equal(country?.placeholderEn, defaultCountry?.placeholderEn);
});

test("unknown saved field ids are dropped and empty settings fall back to defaults", () => {
  const legacyField = {
    ...DEFAULT_SITE_CONTENT_SETTINGS.registrationFields[0],
    id: "legacy",
  } as unknown as RegistrationFieldSetting;
  const ordered = getOrderedRegistrationFields({
    registrationFields: [...DEFAULT_SITE_CONTENT_SETTINGS.registrationFields, legacyField],
  });

  assert.equal(ordered.filter((f) => f.id === "legacy").length, 0);
  const defaultOrder = getOrderedRegistrationFields(null);
  assert.deepEqual(
    defaultOrder.map((f) => f.id).sort(),
    DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.map((f) => f.id).sort(),
  );
  const contactStart = defaultOrder.findIndex((field) => field.id === "country");
  assert.deepEqual(defaultOrder.slice(contactStart, contactStart + 3).map((field) => field.id), ["country", "city", "whatsapp"]);
});

test("app icon size is saved independently and produces versioned PWA icon URLs", () => {
  const settings = normalizeSiteContentSettings({
    brand: { ...DEFAULT_SITE_CONTENT_SETTINGS.brand, appIconDisplaySize: 88 },
  });
  assert.equal(settings.brand.appIconDisplaySize, 88);
  assert.equal(
    getPwaIconUrl(192, settings.brand),
    `/api/pwa-icon/192.png?v=${encodeURIComponent(`${settings.brand.appIconUrl}|88|${settings.brand.appThemeColor}`)}`,
  );
  assert.equal(normalizeSiteContentSettings({ brand: { appIconDisplaySize: 200 } }).brand.appIconDisplaySize, 100);
  assert.equal(normalizeSiteContentSettings({ brand: { appIconDisplaySize: 12 } }).brand.appIconDisplaySize, 30);
});

test("PWA icon URLs change when the uploaded icon or display treatment changes", () => {
  const base = DEFAULT_SITE_CONTENT_SETTINGS.brand;
  const original = getPwaIconUrl(180, base);

  assert.notEqual(
    getPwaIconUrl(180, { ...base, appIconUrl: "/api/site-app-icon/11111111-1111-4111-8111-111111111111" }),
    original,
  );
  assert.notEqual(
    getPwaIconUrl(180, { ...base, appIconDisplaySize: base.appIconDisplaySize + 1 }),
    original,
  );
  assert.notEqual(
    getPwaIconUrl(180, { ...base, appThemeColor: "#123456" }),
    original,
  );
});

test("legacy default colors migrate to the refreshed palette while custom colors stay intact", () => {
  const legacyTheme = {
    ...DEFAULT_SITE_CONTENT_SETTINGS.experience,
    theme: {
      ...DEFAULT_SITE_CONTENT_SETTINGS.experience.theme,
      preset: "misbar" as const,
      primary: "#065634",
      gold: "#d4af37",
      ink: "#18352b",
      background: "#f3f5ef",
      surface: "#fffdf8",
    },
  };
  const refreshed = normalizeSiteContentSettings({
    primaryColor: "#065634",
    accentColor: "#d4af37",
    cardBackgroundColor: "#ffffff",
    experience: legacyTheme,
  });

  assert.equal(refreshed.primaryColor, "#164f3a");
  assert.equal(refreshed.accentColor, "#b68b42");
  assert.equal(refreshed.cardBackgroundColor, "#fbfaf5");
  assert.equal(refreshed.experience.theme.primary, "#164f3a");
  assert.equal(refreshed.experience.theme.gold, "#b68b42");

  const custom = normalizeSiteContentSettings({
    primaryColor: "#1c6491",
    accentColor: "#cb4772",
    cardBackgroundColor: "#f1efff",
    experience: {
      ...legacyTheme,
      theme: {
        ...legacyTheme.theme,
        preset: "custom",
        primary: "#1c6491",
        gold: "#cb4772",
        ink: "#253449",
        background: "#f1efff",
        surface: "#ffffff",
      },
    },
  });

  assert.equal(custom.primaryColor, "#1c6491");
  assert.equal(custom.accentColor, "#cb4772");
  assert.equal(custom.cardBackgroundColor, "#f1efff");
  assert.equal(custom.experience.theme.primary, "#1c6491");
  assert.equal(custom.experience.theme.gold, "#cb4772");
});

test("participant opportunity filter visibility is configurable and defaults on", () => {
  assert.deepEqual(DEFAULT_SITE_CONTENT_SETTINGS.opportunityFilterVisibility, {
    searchBySpecialty: true,
    country: true,
    seats: true,
    deadline: true,
    price: true,
  });
  assert.deepEqual(
    normalizeSiteContentSettings({
      opportunityFilterVisibility: { searchBySpecialty: false, country: true, price: false },
    }).opportunityFilterVisibility,
    { searchBySpecialty: false, country: true, seats: true, deadline: true, price: false },
  );
});

test("invoice settings use a neutral title and only accept safe image URLs", () => {
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.invoiceSettings.enabled, true);
  assert.equal(DEFAULT_SITE_CONTENT_SETTINGS.invoiceSettings.titleAr, "فاتورة مشاركة بحثية");
  const normalized = normalizeSiteContentSettings({
    invoiceSettings: {
      enabled: false,
      titleAr: "فاتورة مشاركة",
      numberPrefix: "M!isbar 2026",
      logoUrl: "javascript:alert(1)",
      stampUrl: "/api/site-brand-logo/11111111-1111-4111-8111-111111111111",
    },
  });

  assert.equal(normalized.invoiceSettings.enabled, false);
  assert.equal(normalized.invoiceSettings.titleAr, "فاتورة مشاركة");
  assert.equal(normalized.invoiceSettings.numberPrefix, "Misbar2026");
  assert.equal(normalized.invoiceSettings.logoUrl, "");
  assert.equal(normalized.invoiceSettings.stampUrl, "/api/site-brand-logo/11111111-1111-4111-8111-111111111111");
  assert.match(normalized.invoiceSettings.applicabilityNoteAr, /الترقية/);
});

test("watermark settings are owner-customizable and normalized within safe bounds", () => {
  const normalized = normalizeSiteContentSettings({
    watermarkSettings: {
      enabled: false,
      textAr: "  مسبار & شركاؤه  ",
      textEn: "MISBAR",
      color: "url(javascript:alert(1))",
      opacity: 0.9,
      fontSize: 40,
      angle: -80,
    },
  });
  assert.equal(normalized.watermarkSettings.enabled, false);
  assert.equal(normalized.watermarkSettings.textAr, "مسبار & شركاؤه");
  assert.equal(normalized.watermarkSettings.textEn, "MISBAR");
  assert.equal(normalized.watermarkSettings.color, DEFAULT_SITE_CONTENT_SETTINGS.watermarkSettings.color);
  assert.equal(normalized.watermarkSettings.opacity, 0.3);
  assert.equal(normalized.watermarkSettings.fontSize, 28);
  assert.equal(normalized.watermarkSettings.angle, -45);
});
