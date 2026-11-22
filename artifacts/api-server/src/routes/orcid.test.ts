import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import cookieParser from "cookie-parser";
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import test from "node:test";
import orcidRouter from "./orcid";

test("ORCID popup returns success, cancellation, and provider-error results", async () => {
  const envKeys = [
    "NODE_ENV",
    "ORCID_ALLOWED_ORIGINS",
    "ORCID_CLIENT_ID",
    "ORCID_CLIENT_SECRET",
    "SESSION_SECRET",
  ] as const;
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  process.env.NODE_ENV = "test";
  process.env.ORCID_ALLOWED_ORIGINS = "https://misbar-test.example";
  process.env.ORCID_CLIENT_ID = "test-client-id";
  process.env.ORCID_CLIENT_SECRET = "test-client-secret";
  process.env.SESSION_SECRET = "test-session-secret";

  let tokenResponse: Response;
  let exchangeCount = 0;
  let tokenRequestBody = "";
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://orcid.org/oauth/token")) {
      exchangeCount += 1;
      tokenRequestBody = String(init?.body);
      return tokenResponse;
    }
    return originalFetch(input, init);
  };

  const app = express();
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.use(cookieParser());
  app.use("/api", orcidRouter);
  let server: Server | undefined;

  try {
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const startAuthorization = async () => {
      const response = await originalFetch(`${baseUrl}/api/orcid/start`, {
        redirect: "manual",
        headers: { referer: "https://misbar-test.example/register" },
      });
      assert.equal(response.status, 302);
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      const authorizationUrl = new URL(response.headers.get("location") || "");
      assert.ok(cookie);
      assert.equal(authorizationUrl.origin, "https://orcid.org");
      assert.equal(authorizationUrl.searchParams.get("scope"), "/authenticate");
      assert.equal(
        authorizationUrl.searchParams.get("redirect_uri"),
        "https://misbar-test.example/api/orcid/callback",
      );
      return { cookie, state: authorizationUrl.searchParams.get("state") || "" };
    };

    tokenResponse = new Response(JSON.stringify({ orcid: "0000-0002-1825-0097" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const success = await startAuthorization();
    const successResponse = await originalFetch(
      `${baseUrl}/api/orcid/callback?code=mock-code&state=${encodeURIComponent(success.state)}`,
      { headers: { cookie: success.cookie } },
    );
    const successHtml = await successResponse.text();
    assert.equal(successResponse.status, 200);
    assert.match(successHtml, /"status":"linked"/);
    assert.match(successHtml, /"orcidId":"0000-0002-1825-0097"/);
    assert.match(tokenRequestBody, /redirect_uri=https%3A%2F%2Fmisbar-test\.example%2Fapi%2Forcid%2Fcallback/);

    const cancelled = await startAuthorization();
    const cancelResponse = await originalFetch(
      `${baseUrl}/api/orcid/callback?error=access_denied&state=${encodeURIComponent(cancelled.state)}`,
      { headers: { cookie: cancelled.cookie } },
    );
    assert.match(await cancelResponse.text(), /"status":"cancelled"/);
    assert.equal(exchangeCount, 1);

    tokenResponse = new Response("provider unavailable", { status: 502 });
    const failed = await startAuthorization();
    const failureResponse = await originalFetch(
      `${baseUrl}/api/orcid/callback?code=mock-code&state=${encodeURIComponent(failed.state)}`,
      { headers: { cookie: failed.cookie } },
    );
    const failureHtml = await failureResponse.text();
    assert.equal(failureResponse.status, 200);
    assert.match(failureHtml, /"status":"error"/);
    assert.match(failureHtml, /"reason":"provider_error"/);
  } finally {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
