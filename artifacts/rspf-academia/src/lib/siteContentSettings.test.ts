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
  assert.equal(ordered[2].id, "city");
  // every default field still renders exactly once
  assert.equal(ordered.length, defaults.length);
  for (const field of defaults) {
    assert.equal(ordered.filter((f) => f.id === field.id).length, 1);
  }
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
  assert.deepEqual(
    getOrderedRegistrationFields(null).map((f) => f.id),
    DEFAULT_SITE_CONTENT_SETTINGS.registrationFields.map((f) => f.id),
  );
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
