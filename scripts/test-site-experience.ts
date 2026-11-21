import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_EXPERIENCE_SETTINGS,
  sanitizeExperienceSettings,
  validateExperienceSettings,
  resolveRouteId,
  ROUTE_IDS,
  PRIVATE_ROUTE_IDS,
} from "../lib/site-experience";
import { migrateLegacySiteIdentity } from "../lib/site-brand-migration";
import { normalizeSiteContentSettings } from "../artifacts/rspf-academia/src/lib/siteContentSettings";

test("legacy identity upgrade preserves custom content and contact destinations", () => {
  const original = {
    brand: { siteNameAr: "أكاديمية SRMA للأبحاث", siteNameEn: "My custom clinic",
      appShortName: "SRMA", logoUrl: "/srma-logo.jpg", email: "old-brand@example.test" },
    pages: { home: { titleAr: "عنوان مخصص", titleEn: "SRMA Research Academy" } },
    participantTitle: "Custom participant portal",
  };
  const upgraded = migrateLegacySiteIdentity(original) as typeof original;
  assert.equal(upgraded.brand.siteNameAr, "مسبار");
  assert.equal(upgraded.brand.siteNameEn, "My custom clinic");
  assert.equal(upgraded.brand.email, original.brand.email);
  assert.equal(upgraded.brand.logoUrl, "/misbar-logo.svg");
  assert.equal(upgraded.pages.home.titleAr, "عنوان مخصص");
  assert.equal(upgraded.pages.home.titleEn, "Misbar");
  assert.equal(original.brand.appShortName, "SRMA", "must not mutate stored object");
  assert.deepEqual(migrateLegacySiteIdentity(upgraded), upgraded, "upgrade is idempotent");
});

test("default contract validates and read normalization preserves saved values", () => {
  const settings = structuredClone(DEFAULT_EXPERIENCE_SETTINGS);
  settings.theme.primary = "#234567";
  settings.theme.baseFontSize = 18;
  settings.home.hero.title = { ar: "اختبار", en: "Persistence test" };
  settings.navigation.items.reverse();
  settings.home.sections[1].visible = false;
  const validated = validateExperienceSettings(settings);
  assert.deepEqual(sanitizeExperienceSettings(JSON.parse(JSON.stringify(validated))), validated);
  assert.equal(validated.home.hero.title.en, "Persistence test");
  assert.deepEqual(validateExperienceSettings(undefined), DEFAULT_EXPERIENCE_SETTINGS);
});

test("homepage showcases normalize for existing settings and validate bilingual entries", () => {
  const settings = structuredClone(DEFAULT_EXPERIENCE_SETTINGS);
  settings.home.affiliations.countries = [{ ar: "السعودية", en: "Saudi Arabia" }];
  settings.home.affiliations.universities = [{ ar: "جامعة معتمدة", en: "Approved University" }];
  settings.home.affiliations.animationDurationSeconds = 24;
  settings.home.journalTicker.animationEnabled = false;
  const validated = validateExperienceSettings(settings);
  assert.equal(validated.home.affiliations.countries[0].en, "Saudi Arabia");
  assert.equal(validated.home.affiliations.universities[0].ar, "جامعة معتمدة");
  assert.equal(validated.home.affiliations.animationDurationSeconds, 24);
  assert.equal(validated.home.journalTicker.animationEnabled, false);

  const legacy = JSON.parse(JSON.stringify(DEFAULT_EXPERIENCE_SETTINGS)) as Record<string, unknown>;
  legacy.version = 1;
  const legacyHome = legacy.home as Record<string, unknown>;
  legacyHome.sections = (legacyHome.sections as Array<{ id: string; visible: boolean }>).filter(
    ({ id }) => !["services", "affiliations", "journalTicker"].includes(id),
  );
  delete legacyHome.services;
  legacyHome.affiliations = {
    title: { ar: "جامعات ودول", en: "Universities and countries" },
    subtitle: { ar: "تظهر هنا الجهات التي اعتمدتم إدراجها في إعدادات الموقع.", en: "Only institutions approved in site settings appear here." },
    countries: [],
    universities: [],
  };
  delete legacyHome.journalTicker;
  (legacyHome.programs as Record<string, unknown>).title = { ar: "عنوان محفوظ", en: "Saved title" };
  const upgraded = sanitizeExperienceSettings(legacy);
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.home.programs.title.ar, "عنوان محفوظ");
  assert.deepEqual(upgraded.home.affiliations.universities, DEFAULT_EXPERIENCE_SETTINGS.home.affiliations.universities);
  assert.deepEqual(upgraded.home.affiliations.countries, DEFAULT_EXPERIENCE_SETTINGS.home.affiliations.countries);
  for (const id of ["services", "affiliations", "journalTicker"]) {
    assert.equal(upgraded.home.sections.find((section) => section.id === id)?.visible, true);
  }
  assert.ok(
    upgraded.home.sections.findIndex((section) => section.id === "services")
      < upgraded.home.sections.findIndex((section) => section.id === "programs"),
  );

  const intentionallyEmpty = structuredClone(DEFAULT_EXPERIENCE_SETTINGS);
  intentionallyEmpty.home.affiliations.universities = [];
  intentionallyEmpty.home.affiliations.countries = [];
  assert.deepEqual(sanitizeExperienceSettings(intentionallyEmpty).home.affiliations.universities, []);
  assert.deepEqual(sanitizeExperienceSettings(intentionallyEmpty).home.affiliations.countries, []);
});

test("site identity accepts editable names, uploaded logo URLs, and explicit logo removal", () => {
  const withUploadedLogo = normalizeSiteContentSettings({
    brand: {
      siteNameAr: "مؤسسة مسبار",
      siteNameEn: "Misbar Foundation",
      logoUrl: "/api/site-brand-logo/12345678-1234-1234-1234-123456789abc",
    },
  });
  assert.equal(withUploadedLogo.brand.siteNameAr, "مؤسسة مسبار");
  assert.equal(withUploadedLogo.brand.siteNameEn, "Misbar Foundation");
  assert.equal(withUploadedLogo.brand.logoUrl, "/api/site-brand-logo/12345678-1234-1234-1234-123456789abc");

  const withoutLogo = normalizeSiteContentSettings({ brand: { logoUrl: "" } });
  assert.equal(withoutLogo.brand.logoUrl, "", "an intentional blank must not restore the default logo");
});

test("strict writes reject unsafe styling, URLs, enum values and limits", () => {
  for (const input of [
    { theme: { primary: "red;display:none" } },
    { theme: { baseFontSize: 1000 } },
    { theme: { headingScale: -1 } },
    { theme: { headingFont: "arbitrary-font" } },
    { home: { hero: { imageUrl: "javascript:alert(1)" } } },
    { home: { hero: { imageUrl: "//evil.example/image" } } },
    { home: { hero: { imageUrl: "https://user:pass@example.test/image" } } },
    { home: { programs: { limit: 500 } } },
    { home: { hero: { title: { ar: "a".repeat(5000), en: "" } } } },
    { home: { affiliations: { universities: [{ ar: "<script>", en: "unsafe" }] } } },
    { home: { affiliations: { countries: Array.from({ length: 25 }, () => ({ ar: "بلد", en: "Country" })) } } },
    { home: { affiliations: { animationDurationSeconds: 5 } } },
    { home: { journalTicker: { animationDurationSeconds: 100 } } },
    { home: { journalTicker: { animationEnabled: "yes" } } },
  ]) assert.throws(() => validateExperienceSettings(input));
});

test("every route has metadata and page chrome and private pages stay private", () => {
  for (const id of ROUTE_IDS) {
    assert.ok(DEFAULT_EXPERIENCE_SETTINGS.seo[id]);
    assert.ok(DEFAULT_EXPERIENCE_SETTINGS.pageChrome[id]);
  }
  for (const id of PRIVATE_ROUTE_IDS) assert.equal(DEFAULT_EXPERIENCE_SETTINGS.seo[id].noIndex, true);
  assert.equal(resolveRouteId("/coordinator-portal"), "coordinator");
  assert.equal(resolveRouteId("/research/42"), "researchDetail");
  assert.equal(resolveRouteId("/knowledge-center/existing-slug"), "knowledgeArticle");
  assert.equal(resolveRouteId("/sign-in/callback"), "signIn");
});
