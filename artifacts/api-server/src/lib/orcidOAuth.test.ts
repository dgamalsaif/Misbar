import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrcidRedirectUri,
  createOrcidStateToken,
  normalizeOrcidId,
  resolveTrustedOrcidOrigin,
  verifyOrcidStateToken,
} from "./orcidOAuth";

const testEnv = {
  NODE_ENV: "production",
  ORCID_ALLOWED_ORIGINS: "https://misbar-test.example",
} as NodeJS.ProcessEnv;

test("only trusted HTTPS origins can start ORCID authorization", () => {
  assert.equal(resolveTrustedOrcidOrigin("https://misbar-test.example/register", testEnv), "https://misbar-test.example");
  assert.equal(resolveTrustedOrcidOrigin("https://attacker.example/register", testEnv), null);
  assert.equal(resolveTrustedOrcidOrigin("http://misbar-test.example/register", testEnv), null);
  assert.equal(
    resolveTrustedOrcidOrigin("http://localhost:5000/register", { NODE_ENV: "development" } as NodeJS.ProcessEnv),
    "http://localhost:5000",
  );
  assert.equal(buildOrcidRedirectUri("https://misbar-test.example"), "https://misbar-test.example/api/orcid/callback");
});

test("signed ORCID state is bound to the browser callback and expires", () => {
  const now = 1_800_000_000_000;
  const token = createOrcidStateToken("state-value", "https://misbar-test.example", "test-secret", now);

  assert.deepEqual(
    verifyOrcidStateToken(token, "state-value", "test-secret", now + 1, testEnv),
    {
      state: "state-value",
      origin: "https://misbar-test.example",
      expiresAt: now + 5 * 60 * 1000,
    },
  );
  assert.equal(verifyOrcidStateToken(token, "wrong-state", "test-secret", now + 1, testEnv), null);
  assert.equal(verifyOrcidStateToken(token, "state-value", "wrong-secret", now + 1, testEnv), null);
  assert.equal(verifyOrcidStateToken(token, "state-value", "test-secret", now + 5 * 60 * 1000, testEnv), null);
});

test("ORCID identifiers are normalized and malformed values are rejected", () => {
  assert.equal(normalizeOrcidId("https://orcid.org/0000-0002-1825-0097"), "0000-0002-1825-0097");
  assert.equal(normalizeOrcidId("000000021825009X"), "0000-0002-1825-009X");
  assert.equal(normalizeOrcidId("not-an-orcid"), null);
});
