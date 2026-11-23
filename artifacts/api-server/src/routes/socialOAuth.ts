import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type Response } from "express";
import { db, socialConnectionsTable } from "@workspace/db";
import { requireManagedOwner } from "../middlewares/ownerAuth";
import {
  createSocialOAuthState,
  encryptSocialSecret,
  socialOAuthCookieName,
  verifySocialOAuthState,
} from "../lib/socialSecurity";

const router = Router();
const configuredSiteOrigin = process.env["PUBLIC_SITE_ORIGIN"]?.trim() || "https://srmaacademy.com";
const parsedSiteOrigin = new URL(configuredSiteOrigin);
if (parsedSiteOrigin.protocol !== "https:" || parsedSiteOrigin.username || parsedSiteOrigin.password) {
  throw new Error("PUBLIC_SITE_ORIGIN must be a trusted HTTPS origin.");
}
const SITE_ORIGIN = parsedSiteOrigin.origin;
const OAUTH_COOKIE = socialOAuthCookieName();
const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
].join(",");
const X_SCOPES = ["users.read", "tweet.read", "tweet.write", "offline.access"].join(" ");

function callbackUrl(provider: "meta" | "x") {
  return `${SITE_ORIGIN}/api/social/${provider}/callback`;
}

function validOrigin() {
  try {
    const parsed = new URL(SITE_ORIGIN);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function setStateCookie(res: Response, cookie: string, maxAgeSeconds: number) {
  res.cookie(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds * 1000,
    path: "/api/social",
  });
}

function clearStateCookie(res: Response) {
  res.clearCookie(OAUTH_COOKIE, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/api/social",
  });
}

function finish(res: Response, result: string) {
  clearStateCookie(res);
  const safeResult = /^[a-z0-9-]+$/.test(result) ? result : "failed";
  res.redirect(302, `${SITE_ORIGIN}/admin?social=${safeResult}`);
}

function providerError(data: Record<string, any>, provider: string) {
  const raw = typeof data.error_description === "string"
    ? data.error_description
    : typeof data.error?.message === "string"
      ? data.error.message
      : typeof data.error === "string"
        ? data.error
        : `${provider} authorization failed`;
  return raw.replace(/\b(?:EA[A-Za-z0-9]{20,}|[A-Za-z0-9_-]{45,})\b/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").slice(0, 300);
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: Record<string, any> = {};
  try {
    data = text ? JSON.parse(text) as Record<string, any> : {};
  } catch {
    data = {};
  }
  if (!response.ok || data.error) {
    throw new Error(providerError(data, response.url.includes("x.com") ? "X" : "Meta"));
  }
  return data;
}

function sameState(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function saveConnection(platform: string, accountId: string, accountName: string, accessToken: string, metadata: Record<string, string | number | boolean | null> = {}, expiresAt: Date | null = null, refreshToken = "") {
  await db.insert(socialConnectionsTable).values({
    platform,
    accountId,
    accountName: accountName.slice(0, 200),
    accessTokenEncrypted: encryptSocialSecret(accessToken),
    refreshTokenEncrypted: refreshToken ? encryptSocialSecret(refreshToken) : "",
    tokenExpiresAt: expiresAt,
    status: "active",
    metadata,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [socialConnectionsTable.platform, socialConnectionsTable.accountId],
    set: {
      accountName: accountName.slice(0, 200),
      accessTokenEncrypted: encryptSocialSecret(accessToken),
      refreshTokenEncrypted: refreshToken ? encryptSocialSecret(refreshToken) : "",
      tokenExpiresAt: expiresAt,
      status: "active",
      metadata,
      updatedAt: new Date(),
    },
  });
}

router.post("/social/meta/start", requireManagedOwner, async (_req, res) => {
  const appId = process.env["META_APP_ID"];
  const version = process.env["META_GRAPH_API_VERSION"];
  if (!appId || !version || !/^v\d{1,2}\.\d$/.test(version) || !validOrigin()) {
    res.status(503).json({ error: "أكمل إعداد Meta في متغيرات خدمة API على Render أولاً." });
    return;
  }
  try {
    // Fail closed before redirecting if durable token encryption is not ready.
    encryptSocialSecret("configuration-check");
    const oauth = createSocialOAuthState("meta");
    setStateCookie(res, oauth.cookie, oauth.maxAgeSeconds);
    const authorizeUrl = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    authorizeUrl.searchParams.set("client_id", appId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl("meta"));
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", META_SCOPES);
    authorizeUrl.searchParams.set("state", oauth.state);
    res.json({ authorizeUrl: authorizeUrl.toString() });
  } catch {
    res.status(503).json({ error: "تعذر بدء الربط الآمن. تحقق من مفاتيح الأمان في Render." });
  }
});

router.get("/social/meta/callback", async (req, res) => {
  const stateCookie = verifySocialOAuthState(req.cookies?.[OAUTH_COOKIE], "meta");
  const returnedState = typeof req.query["state"] === "string" ? req.query["state"] : "";
  const code = typeof req.query["code"] === "string" ? req.query["code"] : "";
  if (!stateCookie || !returnedState || !sameState(stateCookie.state, returnedState)) {
    finish(res, "meta-state-error");
    return;
  }
  if (!code || req.query["error"]) {
    finish(res, "meta-cancelled");
    return;
  }

  const appId = process.env["META_APP_ID"] || "";
  const appSecret = process.env["META_APP_SECRET"] || "";
  const version = process.env["META_GRAPH_API_VERSION"] || "";
  try {
    if (!appId || !appSecret || !/^v\d{1,2}\.\d$/.test(version)) throw new Error("Meta app settings are incomplete.");

    const shortTokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
    shortTokenUrl.searchParams.set("client_id", appId);
    shortTokenUrl.searchParams.set("client_secret", appSecret);
    shortTokenUrl.searchParams.set("redirect_uri", callbackUrl("meta"));
    shortTokenUrl.searchParams.set("code", code);
    const shortToken = await fetchJson(shortTokenUrl.toString());
    if (typeof shortToken.access_token !== "string") throw new Error("Meta did not return an access token.");

    const longTokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", appId);
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", shortToken.access_token);
    const longToken = await fetchJson(longTokenUrl.toString());
    const userToken = typeof longToken.access_token === "string" ? longToken.access_token : shortToken.access_token;
    const accountsUrl = new URL(`https://graph.facebook.com/${version}/me/accounts`);
    accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
    const accounts = await fetchJson(accountsUrl.toString(), { headers: { Authorization: `Bearer ${userToken}` } });
    const pages = Array.isArray(accounts.data) ? accounts.data : [];
    let savedCount = 0;

    for (const page of pages) {
      if (typeof page.id !== "string" || typeof page.access_token !== "string") continue;
      const pageName = typeof page.name === "string" ? page.name : "Facebook Page";
      await saveConnection("facebook", page.id, pageName, page.access_token, { pageId: page.id });
      savedCount++;
      const instagram = page.instagram_business_account;
      if (instagram && typeof instagram.id === "string") {
        const username = typeof instagram.username === "string" ? `@${instagram.username}` : "Instagram account";
        await saveConnection("instagram", instagram.id, username, page.access_token, {
          pageId: page.id,
          instagramUserId: instagram.id,
          pageName,
        });
        savedCount++;
      }
    }
    finish(res, savedCount ? "meta-connected" : "meta-no-pages");
  } catch (error) {
    req.log.warn({ provider: "meta", message: error instanceof Error ? error.message : "unknown" }, "Meta account connection failed");
    finish(res, "meta-failed");
  }
});

router.post("/social/x/start", requireManagedOwner, async (_req, res) => {
  const clientId = process.env["X_CLIENT_ID"];
  if (!clientId || !validOrigin()) {
    res.status(503).json({ error: "أكمل إعداد تطبيق X في متغيرات خدمة API على Render أولاً." });
    return;
  }
  try {
    encryptSocialSecret("configuration-check");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const oauth = createSocialOAuthState("x", verifier);
    setStateCookie(res, oauth.cookie, oauth.maxAgeSeconds);
    const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl("x"));
    authorizeUrl.searchParams.set("scope", X_SCOPES);
    authorizeUrl.searchParams.set("state", oauth.state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    res.json({ authorizeUrl: authorizeUrl.toString() });
  } catch {
    res.status(503).json({ error: "تعذر بدء الربط الآمن. تحقق من مفاتيح الأمان في Render." });
  }
});

router.get("/social/x/callback", async (req, res) => {
  const stateCookie = verifySocialOAuthState(req.cookies?.[OAUTH_COOKIE], "x");
  const returnedState = typeof req.query["state"] === "string" ? req.query["state"] : "";
  const code = typeof req.query["code"] === "string" ? req.query["code"] : "";
  if (!stateCookie || !returnedState || !sameState(stateCookie.state, returnedState)) {
    finish(res, "x-state-error");
    return;
  }
  if (!code || req.query["error"] || !stateCookie.verifier) {
    finish(res, "x-cancelled");
    return;
  }

  const clientId = process.env["X_CLIENT_ID"] || "";
  const clientSecret = process.env["X_CLIENT_SECRET"] || "";
  try {
    if (!clientId) throw new Error("X app settings are incomplete.");
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl("x"),
      code_verifier: stateCookie.verifier,
      client_id: clientId,
    });
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }
    const tokens = await fetchJson("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers,
      body: form,
    });
    if (typeof tokens.access_token !== "string") throw new Error("X did not return an access token.");
    const profile = await fetchJson("https://api.x.com/2/users/me?user.fields=name,username", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = profile.data || {};
    if (typeof user.id !== "string") throw new Error("X did not return the account ID.");
    const now = Date.now();
    const expiresAt = Number.isFinite(Number(tokens.expires_in))
      ? new Date(now + Number(tokens.expires_in) * 1000)
      : null;
    const username = typeof user.username === "string" ? `@${user.username}` : "X account";
    await saveConnection(
      "x",
      user.id,
      username,
      tokens.access_token,
      { username: typeof user.username === "string" ? user.username : "" },
      expiresAt,
      typeof tokens.refresh_token === "string" ? tokens.refresh_token : "",
    );
    finish(res, "x-connected");
  } catch (error) {
    req.log.warn({ provider: "x", message: error instanceof Error ? error.message : "unknown" }, "X account connection failed");
    finish(res, "x-failed");
  }
});

export default router;
