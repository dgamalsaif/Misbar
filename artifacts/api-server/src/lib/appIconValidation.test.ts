import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAppIconMetadata } from "./appIconValidation";

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
