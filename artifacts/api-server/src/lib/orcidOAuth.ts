import { createHmac, timingSafeEqual } from "node:crypto";

export { normalizeOrcidId } from "../../../../lib/orcid-id";

export const ORCID_STATE_TTL_MS = 5 * 60 * 1000;

export interface OrcidStatePayload {
  state: string;
  origin: string;
  expiresAt: number;
}

function normalizeOrigin(value: string): string | null {
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const url = new URL(candidate);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function configuredOrigins(env: NodeJS.ProcessEnv): Set<string> {
  const origins = new Set([
    "https://srmaacademy.com",
    "https://www.srmaacademy.com",
  ]);
  for (const value of (env.ORCID_ALLOWED_ORIGINS || "").split(",")) {
    const origin = normalizeOrigin(value.trim());
    if (origin) origins.add(origin);
  }

  if (env.NODE_ENV !== "production") {
    origins.add("http://localhost");
    origins.add("http://127.0.0.1");
  }
  return origins;
}

export function resolveTrustedOrcidOrigin(
  originOrReferer: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!originOrReferer || originOrReferer === "null") return null;
  try {
    const origin = new URL(originOrReferer).origin;
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && !(env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
      return null;
    }
    if (
      env.NODE_ENV !== "production" &&
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    ) {
      return origin;
    }
    return configuredOrigins(env).has(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function buildOrcidRedirectUri(origin: string): string {
  return new URL("/api/orcid/callback", origin).toString();
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createOrcidStateToken(
  state: string,
  origin: string,
  secret: string,
  now = Date.now(),
): string {
  if (!secret) throw new Error("ORCID OAuth state signing is unavailable");
  const payload = Buffer.from(JSON.stringify({
    state,
    origin,
    expiresAt: now + ORCID_STATE_TTL_MS,
  })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyOrcidStateToken(
  token: unknown,
  returnedState: string,
  secret: string,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): OrcidStatePayload | null {
  if (typeof token !== "string" || !secret || !returnedState) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = sign(encodedPayload, secret);
  const providedBytes = Buffer.from(providedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OrcidStatePayload;
    if (
      typeof payload.state !== "string" ||
      typeof payload.origin !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now ||
      !resolveTrustedOrcidOrigin(payload.origin, env)
    ) {
      return null;
    }
    const expectedState = Buffer.from(payload.state);
    const actualState = Buffer.from(returnedState);
    if (expectedState.length !== actualState.length || !timingSafeEqual(expectedState, actualState)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
