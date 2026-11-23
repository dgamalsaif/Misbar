import assert from "node:assert/strict";
import { test } from "node:test";
import type { SocialConnection } from "@workspace/db";
import { buildSocialPostContent } from "./socialPostContent";
import { encryptSocialSecret, decryptSocialSecret, createSocialOAuthState, verifySocialOAuthState } from "./socialSecurity";
import { publishToConnection, SocialProviderError } from "./socialProviders";

process.env["SOCIAL_CREDENTIALS_ENCRYPTION_KEY"] = Buffer.alloc(32, 7).toString("base64");
process.env["SESSION_SECRET"] = "social-test-session-secret-32-bytes-minimum";
process.env["PUBLIC_SITE_ORIGIN"] = "https://srmaacademy.com";

test("social content omits title, specialty, and image when hidden", () => {
  const content = buildSocialPostContent({
    id: 45,
    titleEn: "Private research title",
    specialtyEn: "Hidden specialty",
    imagePath: "private/research.jpg",
    hiddenFields: ["title", "preview", "specialty", "image"],
  });

  assert.equal(content.titleVisible, false);
  assert.equal(content.specialtyVisible, false);
  assert.equal(content.opportunityImageVisible, false);
  assert.equal(content.text.includes("Private research title"), false);
  assert.equal(content.text.includes("Hidden specialty"), false);
  assert.equal(content.imageUrl, "https://srmaacademy.com/api/site-share-image");
  assert.equal(content.shareUrl, "https://srmaacademy.com/share/research/45");
});

test("social credentials encrypt and decrypt without exposing plaintext", () => {
  const token = "test-provider-access-token";
  const encrypted = encryptSocialSecret(token);
  assert.notEqual(encrypted, token);
  assert.equal(decryptSocialSecret(encrypted), token);
  assert.throws(() => decryptSocialSecret(`${encrypted.slice(0, -2)}xx`));
});

test("OAuth state validates provider and rejects tampering", () => {
  const created = createSocialOAuthState("x", "x".repeat(48));
  assert.equal(verifySocialOAuthState(created.cookie, "x")?.state, created.state);
  assert.equal(verifySocialOAuthState(created.cookie, "meta"), null);
  assert.equal(verifySocialOAuthState(`${created.cookie}tampered`, "x"), null);
});

test("X publication uses the encrypted token only as a bearer header", async (t) => {
  let capturedAuthorization = "";
  let capturedBody = "";
  const fetchMock = t.mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    capturedAuthorization = headers.get("Authorization") || "";
    capturedBody = String(init?.body || "");
    return new Response(JSON.stringify({ data: { id: "x-post-123" } }), { status: 201 });
  });

  const connection = {
    platform: "x",
    accountId: "user-1",
    accountName: "@misbar",
    accessTokenEncrypted: encryptSocialSecret("x-secret-token"),
    refreshTokenEncrypted: "",
    tokenExpiresAt: null,
    metadata: {},
  } as SocialConnection;
  const content = buildSocialPostContent({
    id: 12,
    titleEn: "Visible research title",
    specialtyEn: "Internal Medicine",
    imagePath: "public/image.jpg",
    hiddenFields: [],
  });

  const id = await publishToConnection(connection, content);
  assert.equal(id, "x-post-123");
  assert.equal(capturedAuthorization, "Bearer x-secret-token");
  assert.equal(capturedBody.includes("Visible research title"), true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("provider authorization failures can be retried only after reconnecting", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({ detail: "Permission denied" }), { status: 403 }));
  const connection = {
    platform: "x",
    accountId: "user-1",
    accountName: "@misbar",
    accessTokenEncrypted: encryptSocialSecret("x-secret-token"),
    refreshTokenEncrypted: "",
    tokenExpiresAt: null,
    metadata: {},
  } as SocialConnection;
  const content = buildSocialPostContent({
    id: 12,
    titleEn: "Visible research title",
    specialtyEn: "Internal Medicine",
    imagePath: "public/image.jpg",
    hiddenFields: [],
  });

  await assert.rejects(
    publishToConnection(connection, content),
    (error: unknown) => error instanceof SocialProviderError &&
      error.statusCode === 403 && !error.outcomeUnknown,
  );
});

test("provider server errors are marked uncertain to prevent duplicate reposting", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({ detail: "Temporary outage" }), { status: 503 }));
  const connection = {
    platform: "x",
    accountId: "user-1",
    accountName: "@misbar",
    accessTokenEncrypted: encryptSocialSecret("x-secret-token"),
    refreshTokenEncrypted: "",
    tokenExpiresAt: null,
    metadata: {},
  } as SocialConnection;
  const content = buildSocialPostContent({
    id: 12,
    titleEn: "Visible research title",
    specialtyEn: "Internal Medicine",
    imagePath: "public/image.jpg",
    hiddenFields: [],
  });

  await assert.rejects(
    publishToConnection(connection, content),
    (error: unknown) => error instanceof SocialProviderError &&
      error.statusCode === 503 && error.outcomeUnknown,
  );
});
