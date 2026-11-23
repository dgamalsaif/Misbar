import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderParticipantUpdateEmail } from "./mailer";

test("participant update email escapes research content and preserves safe links", () => {
  const html = renderParticipantUpdateEmail({
    title: '<img src=x onerror="alert(1)">',
    stageLabel: "تم النشر",
    message: "<script>alert(1)</script>\nتحديث جديد",
    inboxUrl: "https://srmaacademy.com/notifications/verify?token=opaque&source=email",
    unsubscribeUrl: "https://srmaacademy.com/notifications/unsubscribe?token=opaque",
  });

  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /https:\/\/srmaacademy\.com\/notifications\/verify\?token=opaque&amp;source=email/);
  assert.match(html, /notifications\/unsubscribe\?token=opaque/);
});
