import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  buildOrcidRedirectUri,
  createOrcidStateToken,
  normalizeOrcidId,
  resolveTrustedOrcidOrigin,
  verifyOrcidStateToken,
} from "../lib/orcidOAuth";

const router: IRouter = Router();
const STATE_COOKIE = "misbar_orcid_state";
const CALLBACK_PATH = "/api/orcid";
const ORCID_BASE_URL = "https://orcid.org";

type PopupStatus = "linked" | "cancelled" | "error";
type PopupReason = "not_configured" | "provider_error" | "invalid_response" | "access_denied";

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function sendPopupResult(
  response: Response,
  origin: string,
  result: { status: PopupStatus; orcidId?: string; reason?: PopupReason },
  statusCode = 200,
): void {
  const nonce = randomBytes(18).toString("base64url");
  const payload = safeJson({ type: "misbar-orcid-auth", ...result });
  const targetOrigin = safeJson(origin);

  response
    .status(statusCode)
    .set({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    })
    .type("html")
    .send(`<!doctype html>
<html lang="ar"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ORCID</title><body><main><p>تمت إعادة النتيجة إلى نموذج التسجيل. يمكنك إغلاق هذه النافذة.</p></main>
<script nonce="${nonce}">
(() => {
  const result = ${payload};
  try {
    if (window.opener) window.opener.postMessage(result, ${targetOrigin});
  } finally {
    window.setTimeout(() => window.close(), 100);
  }
})();
</script></body></html>`);
}

function sendUntrustedCallbackError(response: Response): void {
  response
    .status(400)
    .set({
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    })
    .type("text")
    .send("ORCID authorization could not be verified. Close this window and try again.");
}

function getQueryValue(value: unknown): string | null {
  return typeof value === "string" && value.length <= 4096 ? value : null;
}

function cookieOptions(origin: string) {
  return {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax" as const,
    path: CALLBACK_PATH,
    maxAge: 5 * 60 * 1000,
  };
}

function clearStateCookie(response: Response, origin: string): void {
  const options = cookieOptions(origin);
  response.clearCookie(STATE_COOKIE, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

router.get("/orcid/start", (request: Request, response: Response) => {
  const appOrigin = resolveTrustedOrcidOrigin(
    request.get("origin") || request.get("referer"),
  );
  if (!appOrigin) {
    response.status(400).json({ error: "ORCID authorization must start from the Misbar registration page." });
    return;
  }

  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  const signingSecret = process.env.SESSION_SECRET;
  if (!clientId || !clientSecret || !signingSecret) {
    sendPopupResult(response, appOrigin, { status: "error", reason: "not_configured" });
    return;
  }

  const state = randomBytes(32).toString("base64url");
  const redirectUri = buildOrcidRedirectUri(appOrigin);
  const token = createOrcidStateToken(state, appOrigin, signingSecret);
  response.cookie(STATE_COOKIE, token, cookieOptions(appOrigin));
  response.set("Cache-Control", "no-store");

  const authorizationUrl = new URL("/oauth/authorize", ORCID_BASE_URL);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "/authenticate",
    redirect_uri: redirectUri,
    state,
  }).toString();
  response.redirect(302, authorizationUrl.toString());
});

router.get("/orcid/callback", async (request: Request, response: Response): Promise<void> => {
  const state = getQueryValue(request.query.state);
  const signingSecret = process.env.SESSION_SECRET;
  const verifiedState = state && signingSecret
    ? verifyOrcidStateToken(request.cookies?.[STATE_COOKIE], state, signingSecret)
    : null;

  if (!verifiedState) {
    sendUntrustedCallbackError(response);
    return;
  }

  clearStateCookie(response, verifiedState.origin);

  const oauthError = getQueryValue(request.query.error);
  if (oauthError) {
    const denied = oauthError === "access_denied";
    sendPopupResult(response, verifiedState.origin, {
      status: denied ? "cancelled" : "error",
      reason: denied ? "access_denied" : "provider_error",
    });
    return;
  }

  const code = getQueryValue(request.query.code);
  const clientId = process.env.ORCID_CLIENT_ID;
  const clientSecret = process.env.ORCID_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) {
    sendPopupResult(response, verifiedState.origin, { status: "error", reason: "not_configured" });
    return;
  }

  try {
    const tokenResponse = await fetch(new URL("/oauth/token", ORCID_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: buildOrcidRedirectUri(verifiedState.origin),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      request.log.warn({ statusCode: tokenResponse.status }, "ORCID token exchange was rejected");
      sendPopupResult(response, verifiedState.origin, { status: "error", reason: "provider_error" });
      return;
    }

    const tokenBody: unknown = await tokenResponse.json();
    const orcidId = tokenBody && typeof tokenBody === "object" && "orcid" in tokenBody
      ? normalizeOrcidId(tokenBody.orcid)
      : null;
    if (!orcidId) {
      request.log.warn("ORCID token response did not contain a valid identifier");
      sendPopupResult(response, verifiedState.origin, { status: "error", reason: "invalid_response" });
      return;
    }

    sendPopupResult(response, verifiedState.origin, { status: "linked", orcidId });
  } catch (error) {
    request.log.warn({ error }, "ORCID token exchange failed");
    sendPopupResult(response, verifiedState.origin, { status: "error", reason: "provider_error" });
  }
});

export default router;
