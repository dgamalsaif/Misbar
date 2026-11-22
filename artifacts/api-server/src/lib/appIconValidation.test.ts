import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { validateAppIconImageBytes, validateAppIconMetadata, validateAppIconUrl } from "./appIconValidation";

test("accepts supported icons with usable image dimensions", () => {
  assert.doesNotThrow(() => validateAppIconMetadata({ format: "png", width: 512, height: 512 }));
  assert.doesNotThrow(() => validateAppIconMetadata({ format: "webp", width: 320, height: 480 }));
});

test("rejects unsupported formats and dimensions outside the safe range", () => {
  assert.throws(() => validateAppIconMetadata({ format: "svg", width: 512, height: 512 }));
  assert.throws(() => validateAppIconMetadata({ format: "png", width: 64, height: 128 }));
  assert.throws(() => validateAppIconMetadata({ format: "jpeg", width: 5000, height: 5000 }));
  assert.throws(() => validateAppIconMetadata({ format: "png", width: 512 }));
});

test("accepts only supported local paths and HTTPS icon URLs from the site domain", () => {
  assert.equal(validateAppIconUrl("/misbar-logo.svg"), "/misbar-logo.svg");
  assert.equal(
    validateAppIconUrl("https://www.srmaacademy.com/images/icon.png"),
    "https://www.srmaacademy.com/images/icon.png",
  );
  assert.throws(() => validateAppIconUrl("http://srmaacademy.com/icon.png"));
  assert.throws(() => validateAppIconUrl("https://example.com/icon.png"));
  assert.throws(() => validateAppIconUrl("https://user:pass@srmaacademy.com/icon.png"));
  assert.throws(() => validateAppIconUrl("//example.com/icon.png"));
  assert.throws(() => validateAppIconUrl("/images/../private.png"));
});

test("rejects broken image bytes even when their URL is reachable", async () => {
  const validPng = await sharp({
    create: { width: 128, height: 128, channels: 4, background: "#117b59" },
  }).png().toBuffer();
  await assert.doesNotReject(() => validateAppIconImageBytes(validPng));
  await assert.rejects(
    () => validateAppIconImageBytes(Buffer.from("not an image")),
    /تعذر تحميل صورة أيقونة التطبيق/,
  );
  await assert.rejects(
    () => validateAppIconImageBytes(Buffer.alloc(0)),
    /تعذر تحميل صورة أيقونة التطبيق/,
  );
});
