import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAllowedCoordinatorMutation } from "./coordinatorPermissions";

test("participant inbox write endpoints use the separate verified email session", () => {
  for (const [method, path] of [
    ["POST", "/participant/notifications/access-link"],
    ["POST", "/participant/notifications/verify"],
    ["PATCH", "/participant/notifications/1/read"],
    ["PATCH", "/participant/notifications/preferences"],
    ["POST", "/participant/notifications/push-subscriptions"],
    ["POST", "/participant/notifications/push-subscriptions/remove"],
    ["POST", "/participant/notifications/unsubscribe"],
    ["POST", "/participant/notifications/logout"],
    ["DELETE", "/participant/notifications/push-subscriptions/3"],
  ]) assert.equal(isAllowedCoordinatorMutation(method, path), true, `${method} ${path}`);
  assert.equal(isAllowedCoordinatorMutation("POST", "/participant/notifications/admin"), false);
});
