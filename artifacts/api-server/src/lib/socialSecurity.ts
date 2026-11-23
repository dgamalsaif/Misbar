import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const OAUTH_COOKIE = "misbar_social_oauth";
const OAUTH_TTL_SECONDS = 10 * 60;

export type SocialOAuthProvider = "meta" | "x";

type OAuthStatePayload = {
  provider: SocialOAuthProvider;
  state: string;
  verifier?: string;
  expiresAt: number;
};

function encryptionKey() {
  const value = process.env["SOCIAL_CREDENTIALS_ENCRYPTION_KEY"] || "";
  let key: Buffer;
  try {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) {
      throw new Error();
    }
    key = Buffer.from(value, "base64");
  } catch {
    throw new Error("Social credential encryption is not configured.");
  }
  if (key.length !== 32) {
    throw new Error("Social credential encryption is not configured.");
  }
  return key;
}

function stateSecret() {
  const secret = process.env["SESSION_SECRET"] || "";
  if (secret.length < 32) {
    throw new Error("Secure OAuth state signing is not configured.");
  }
  return secret;
}

export function encryptSocialSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSocialSecret(value: string) {
  const [version, ivPart, ciphertextPart, tagPart] = value.split(".");
  if (version !== "v1" || !ivPart || !ciphertextPart || !tagPart) {
    throw new Error("Stored social credential cannot be decrypted.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function signState(encoded: string) {
  return createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
}

export function createSocialOAuthState(provider: SocialOAuthProvider, verifier?: string) {
  const payload: OAuthStatePayload = {
    provider,
    state: randomBytes(32).toString("base64url"),
    ...(verifier ? { verifier } : {}),
    expiresAt: Math.floor(Date.now() / 1000) + OAUTH_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    state: payload.state,
    cookie: `${encoded}.${signState(encoded)}`,
    maxAgeSeconds: OAUTH_TTL_SECONDS,
  };
}

export function verifySocialOAuthState(value: string | undefined, provider: SocialOAuthProvider) {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const encoded = value.slice(0, separator);
  const suppliedSignature = Buffer.from(value.slice(separator + 1));
  const expectedSignature = Buffer.from(signState(encoded));
  if (suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (payload.provider !== provider ||
        typeof payload.state !== "string" ||
        payload.state.length < 32 ||
        !Number.isInteger(payload.expiresAt) ||
        payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    if (payload.verifier !== undefined &&
        (typeof payload.verifier !== "string" || payload.verifier.length < 43 || payload.verifier.length > 128)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function socialOAuthCookieName() {
  return OAUTH_COOKIE;
}
