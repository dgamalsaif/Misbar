/**
 * Development-only integration check. Uses the real settings persistence path,
 * verifies a separate HTTP reader and always restores the original row.
 * Run only against a private development workspace (never production).
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { coordinatorPortalSettingsTable, db, pool } from "../lib/db/src/index";
import { getSiteContentSettings, saveSiteContentSettings, SITE_CONTENT_KEY } from "../artifacts/api-server/src/lib/siteContentSettings";

if (process.env.NODE_ENV === "production") throw new Error("This check is development-only");
const [original] = await db.select().from(coordinatorPortalSettingsTable)
  .where(eq(coordinatorPortalSettingsTable.key, SITE_CONTENT_KEY)).limit(1);
try {
  const settings = await getSiteContentSettings();
  settings.experience.theme.primary = "#325746";
  settings.experience.home.hero.title = { ar: "فحص حفظ مؤقت", en: "Temporary persistence check" };
  await saveSiteContentSettings(settings);
  const reloaded = await getSiteContentSettings();
  assert.equal(reloaded.experience.theme.primary, "#325746");
  // Two independent, unauthenticated HTTP reads model separate visitor sessions.
  for (let i = 0; i < 2; i++) {
    const response = await fetch("http://localhost:80/api/site-content-settings", { cache: "no-store" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.experience.home.hero.title.en, "Temporary persistence check");
    assert.equal(data.experience.theme.primary, "#325746");
  }
  const forbidden = await fetch("http://localhost:80/api/site-content-settings", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experience: { theme: { primary: "#000000" } } }),
  });
  assert.equal(forbidden.status, 403);
  assert.equal((await getSiteContentSettings()).experience.theme.primary, "#325746");
  console.info("PASS: durable settings roundtrip, independent HTTP readers, unauthorized write rejected");
} finally {
  if (original) {
    await db.update(coordinatorPortalSettingsTable).set({ value: original.value, updatedAt: original.updatedAt })
      .where(eq(coordinatorPortalSettingsTable.key, SITE_CONTENT_KEY));
  } else {
    await db.delete(coordinatorPortalSettingsTable).where(eq(coordinatorPortalSettingsTable.key, SITE_CONTENT_KEY));
  }
  await pool?.end();
}
