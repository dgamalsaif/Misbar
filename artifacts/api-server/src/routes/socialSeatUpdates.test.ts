import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

test("automatic seat update history and retry routes are owner-only", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "misbar-seat-update-routes-"));
  const routeFile = resolve(dirname(fileURLToPath(import.meta.url)), "socialSeatUpdates.ts");
  const mocks: Record<string, string> = {
    "../middlewares/ownerAuth": `
      export const requireManagedOwner = (req,res,next) =>
        req.headers["x-role"] === "owner" ? next() : res.status(403).json({error:"owner only"});
    `,
    "../lib/socialSeatUpdateWorker": `
      const calls = [];
      export const getCalls = () => calls;
      export async function listSocialSeatUpdates(id) {
        calls.push(["list", id]);
        return [{id:7,seatsLeft:2,totalSeats:9,firstAuthorSeatsLeft:1,coAuthorSeatsLeft:1,status:"completed",lastError:"",createdAt:new Date(),deliveries:[]}];
      }
      export async function retrySocialSeatUpdate(id) {
        calls.push(["retry", id]);
        return {ok:true,message:"queued"};
      }
    `,
  };
  const source = `
    import express from "express";
    import socialSeatUpdates from "${routeFile}";
    import { getCalls } from "../lib/socialSeatUpdateWorker";
    export const app = express();
    app.use(express.json());
    app.use((req,_res,next) => { req.log = {error:()=>{}}; next(); });
    app.use("/api", socialSeatUpdates);
    export const calls = getCalls();
  `;
  let server: any;
  try {
    const outfile = resolve(dir, "seat-update-routes.cjs");
    await build({
      stdin: { contents: source, resolveDir: process.cwd() },
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [{
        name: "seat-update-route-fixtures",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) =>
            mocks[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents: mocks[args.path],
            loader: "js",
          }));
        },
      }],
    });
    const fixture = createRequire(import.meta.url)(outfile);
    const calls = fixture.calls as unknown[];
    server = fixture.app.listen(0, "127.0.0.1");
    await new Promise<void>((resolveReady) => server.once("listening", resolveReady));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const headers = (role: string) => ({ "Content-Type": "application/json", "x-role": role });

    let response = await fetch(`${base}/admin/programs/12/social-seat-updates`, { headers: headers("public") });
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);

    response = await fetch(`${base}/admin/programs/12/social-seat-updates`, { headers: headers("owner") });
    assert.equal(response.status, 200);
    const result = await response.json() as { events: Array<{ seatsLeft: number; totalSeats: number }> };
    assert.equal(result.events[0]?.seatsLeft, 2);
    assert.equal(result.events[0]?.totalSeats, 9);
    assert.deepEqual(calls[0], ["list", 12]);

    response = await fetch(`${base}/admin/social-seat-updates/7/retry`, {
      method: "POST", headers: headers("public"), body: "{}",
    });
    assert.equal(response.status, 403);
    assert.equal(calls.length, 1);

    response = await fetch(`${base}/admin/social-seat-updates/7/retry`, {
      method: "POST", headers: headers("owner"), body: "{}",
    });
    assert.equal(response.status, 202);
    assert.deepEqual(calls[1], ["retry", 7]);
  } finally {
    server?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
