import { createHash, randomBytes } from "node:crypto";

export const PARTICIPANT_NOTIFICATION_COOKIE = "misbar_participant_notifications";
export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const UNSUBSCRIBE_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const ACCESS_LINK_COOLDOWN_MS = 60 * 1000;

const STAGE_LABELS: Record<string, string> = {
  general_update: "تحديث بحثي",
  seats_full: "اكتملت المقاعد",
  ethics_approved: "موافقة أخلاقية / PROSPERO",
  submitted: "تم الرفع في المجلة",
  under_review: "قيد مراجعة المجلة",
  accepted: "مقبولة",
  published: "تم النشر",
  completed: "اكتمل البحث",
};

const WEB_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

export function isSupportedWebPushEndpoint(value: string) {
  try {
    const endpoint = new URL(value);
    return endpoint.protocol === "https:" &&
      !endpoint.username &&
      !endpoint.password &&
      WEB_PUSH_HOSTS.some((host) => endpoint.hostname.toLowerCase() === host);
  } catch {
    return false;
  }
}

export function normalizeNotificationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createOpaqueNotificationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashNotificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getResearchUpdateStageLabel(stage: string) {
  return STAGE_LABELS[stage] || STAGE_LABELS.general_update;
}

/** Push content is intentionally generic; the research title and participant data stay out of lock-screen previews. */
export function buildGenericResearchPushPayload() {
  return JSON.stringify({ type: "research-update" });
}

export function buildPublicSiteUrl(path: string, origin = process.env.PUBLIC_SITE_ORIGIN || "https://srmaacademy.com") {
  const base = new URL(origin);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new Error("PUBLIC_SITE_ORIGIN must use HTTPS.");
  }
  const url = new URL(path, base);
  if (url.origin !== base.origin || !path.startsWith("/")) {
    throw new Error("Notification links must stay on the configured Misbar site.");
  }
  return url.toString();
}
