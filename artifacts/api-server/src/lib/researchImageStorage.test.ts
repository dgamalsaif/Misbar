import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  getResearchImageBytes,
  ResearchImageStorageError,
  uploadResearchImage,
} from "./researchImageStorage";

process.env.NODE_ENV = "test";
process.env.REPLIT_DEV_DOMAIN = "preview.invalid";
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET = "test-bucket";

test("blocks image uploads outside the production API even if R2 is configured", async () => {
  await assert.rejects(
    uploadResearchImage({
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      contentType: "image/png",
    }),
    (error: unknown) => error instanceof ResearchImageStorageError,
  );
});

test("does not connect to R2 or read a local fallback in the Replit preview", async () => {
  const objectPath = `/objects/research-images/${randomUUID()}`;
  assert.equal(await getResearchImageBytes(objectPath), null);
});
