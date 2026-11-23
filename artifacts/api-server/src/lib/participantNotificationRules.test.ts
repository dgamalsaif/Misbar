import assert from "node:assert/strict";
import test from "node:test";
import {
  eligibleNotificationEmails,
  classifyEmailDeliveryError,
  classifyPushDeliveryError,
  isSameNotificationEvent,
  isRetryableDeliveryStatus,
  RETRYABLE_DELIVERY_STATUSES,
  shouldQueueEmailNotification,
  shouldQueuePushNotification,
} from "./participantNotificationRules";

test("notification recipients are trimmed, normalized, unique, and exclude rejected registrations", () => {
  assert.deepEqual(eligibleNotificationEmails([
    { email: " Person@Example.com ", status: "pending" },
    { email: "person@example.com", status: "approved" },
    { email: "rejected@example.com", status: "rejected" },
    { email: "deleted@example.com", status: "deleted" },
    { email: " ", status: "approved" },
  ]), ["person@example.com"]);
});

test("idempotency replay accepts identical content and rejects changed content", () => {
  const event = { opportunityId: 12, stage: "under_review", title: "Progress", message: "Review started" };
  assert.equal(isSameNotificationEvent(event, { ...event }), true);
  assert.equal(isSameNotificationEvent(event, { ...event, message: "Accepted" }), false);
  assert.equal(isSameNotificationEvent(event, { ...event, opportunityId: 99 }), false);
});

test("participant channel consent and service configuration are both required", () => {
  assert.equal(shouldQueueEmailNotification(true, true), true);
  assert.equal(shouldQueueEmailNotification(false, true), false);
  assert.equal(shouldQueueEmailNotification(true, false), false);
  assert.equal(shouldQueuePushNotification(true, true), true);
  assert.equal(shouldQueuePushNotification(false, true), false);
  assert.equal(shouldQueuePushNotification(true, false), false);
});

test("only confirmed failed deliveries are eligible for manual retry", () => {
  assert.deepEqual(RETRYABLE_DELIVERY_STATUSES, ["failed"]);
  assert.equal(isRetryableDeliveryStatus("failed"), true);
  assert.equal(isRetryableDeliveryStatus("unknown"), false);
  assert.equal(isRetryableDeliveryStatus("sent"), false);
});

test("uncertain delivery failures are never treated as safe automatic retries", () => {
  assert.equal(classifyEmailDeliveryError({ code: "ETIMEDOUT" }), "unknown");
  assert.equal(classifyEmailDeliveryError({ code: "ECONNRESET" }), "unknown");
  assert.equal(classifyEmailDeliveryError({ code: "EAUTH" }), "failed");
  assert.equal(classifyPushDeliveryError({ statusCode: 410 }), "skipped");
  assert.equal(classifyPushDeliveryError({ statusCode: 403 }), "failed");
  assert.equal(classifyPushDeliveryError({ statusCode: 503 }), "unknown");
});
