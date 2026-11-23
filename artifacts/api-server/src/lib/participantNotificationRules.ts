export const RETRYABLE_DELIVERY_STATUSES = ["failed"] as const;

export type NotificationDeliveryResult = "sent" | "failed" | "unknown" | "skipped";

export function isRetryableDeliveryStatus(status: string) {
  return (RETRYABLE_DELIVERY_STATUSES as readonly string[]).includes(status);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code || "").toUpperCase()
    : "";
}

export function classifyEmailDeliveryError(error: unknown): NotificationDeliveryResult {
  return ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET", "ETLS"].includes(errorCode(error))
    ? "unknown"
    : "failed";
}

export function classifyPushDeliveryError(error: unknown): NotificationDeliveryResult {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : 0;
  if (statusCode === 404 || statusCode === 410) return "skipped";
  if (statusCode >= 400 && statusCode < 500) return "failed";
  return "unknown";
}

type NotificationEventContent = {
  opportunityId: number;
  stage: string;
  title: string;
  message: string;
};

export function isSameNotificationEvent(
  existing: NotificationEventContent,
  candidate: NotificationEventContent,
) {
  return existing.opportunityId === candidate.opportunityId &&
    existing.stage === candidate.stage &&
    existing.title === candidate.title &&
    existing.message === candidate.message;
}

export function eligibleNotificationEmails(registrations: Array<{ email: string; status: string }>) {
  const excludedStatuses = new Set(["rejected", "deleted"]);
  return [...new Set(registrations
    .filter((registration) => !excludedStatuses.has(registration.status))
    .map((registration) => registration.email.trim().toLowerCase())
    .filter(Boolean))];
}

export function shouldQueueEmailNotification(emailEnabled: boolean, smtpAvailable: boolean) {
  return emailEnabled && smtpAvailable;
}

export function shouldQueuePushNotification(pushEnabled: boolean, pushAvailable: boolean) {
  return pushEnabled && pushAvailable;
}
