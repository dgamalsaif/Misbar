import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildGenericResearchPushPayload,
  buildPublicSiteUrl,
  createOpaqueNotificationToken,
  getResearchUpdateStageLabel,
  hashNotificationToken,
  isSupportedWebPushEndpoint,
  normalizeNotificationEmail,
} from "./participantNotificationSecurity";

test("participant access tokens are opaque, URL-safe, and stored as SHA-256 hashes", () => {
  const token = createOpaqueNotificationToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(hashNotificationToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashNotificationToken(token), token);
});

test("participant email matching is whitespace and case insensitive", () => {
  assert.equal(normalizeNotificationEmail("  Student@Example.COM "), "student@example.com");
});

test("public notification links stay on the configured HTTPS site", () => {
  assert.equal(
    buildPublicSiteUrl("/notifications/verify", "https://srmaacademy.com"),
    "https://srmaacademy.com/notifications/verify",
  );
  assert.throws(() => buildPublicSiteUrl("//attacker.example/path", "https://srmaacademy.com"));
  assert.throws(() => buildPublicSiteUrl("/notifications", "http://srmaacademy.com"));
});

test("lock-screen push payload contains no research title or participant information", () => {
  const payload = buildGenericResearchPushPayload();
  assert.equal(payload, JSON.stringify({ type: "research-update" }));
  assert.doesNotMatch(payload, /research title|email|participant|student/i);
});

test("only standard secure browser push service endpoints are accepted", () => {
  assert.equal(isSupportedWebPushEndpoint("https://fcm.googleapis.com/fcm/send/opaque"), true);
  assert.equal(isSupportedWebPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/opaque"), true);
  assert.equal(isSupportedWebPushEndpoint("https://web.push.apple.com/opaque"), true);
  assert.equal(isSupportedWebPushEndpoint("http://fcm.googleapis.com/send"), false);
  assert.equal(isSupportedWebPushEndpoint("https://127.0.0.1/private"), false);
  assert.equal(isSupportedWebPushEndpoint("https://attacker.example/collect"), false);
});

test("research stage labels have a safe fallback", () => {
  assert.equal(getResearchUpdateStageLabel("published"), "تم النشر");
  assert.equal(getResearchUpdateStageLabel("unknown"), "تحديث بحثي");
});
