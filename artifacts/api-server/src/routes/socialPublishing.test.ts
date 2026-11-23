import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const fixtureDb = `
const column = (table, field) => ({ table, field });
export const researchProgramsTable = {
  __name: "programs",
  id: column("programs", "id"), titleEn: column("programs", "titleEn"),
  specialtyEn: column("programs", "specialtyEn"), imagePath: column("programs", "imagePath"),
  category: column("programs", "category"), status: column("programs", "status"),
  seatsLeft: column("programs", "seatsLeft"),
};
export const socialConnectionsTable = {
  __name: "connections",
  id: column("connections", "id"), platform: column("connections", "platform"),
  accountId: column("connections", "accountId"), accountName: column("connections", "accountName"),
  status: column("connections", "status"),
};
export const socialPostRecordsTable = {
  __name: "posts",
  id: column("posts", "id"), opportunityId: column("posts", "opportunityId"),
  connectionId: column("posts", "connectionId"), platform: column("posts", "platform"),
  accountId: column("posts", "accountId"), accountName: column("posts", "accountName"),
  status: column("posts", "status"), content: column("posts", "content"),
  externalPostId: column("posts", "externalPostId"), lastError: column("posts", "lastError"),
  publishedAt: column("posts", "publishedAt"), createdAt: column("posts", "createdAt"),
  updatedAt: column("posts", "updatedAt"),
};
let state;
export function reset() {
  state = {
    programs: [{ id: 1, titleEn: "Private research title", specialtyEn: "Internal Medicine",
      imagePath: "/private/research.jpg", category: "active", status: "open", seatsLeft: 5 }],
    connections: [{ id: 11, platform: "facebook", accountId: "page-1", accountName: "Misbar Page",
      status: "active", accessTokenEncrypted: "encrypted", refreshTokenEncrypted: "",
      tokenExpiresAt: null, metadata: {} }],
    posts: [],
    hiddenFields: [],
  };
}
reset();
export const snapshot = () => structuredClone(state);
export const setHiddenFields = (fields) => { state.hiddenFields = fields; };
export const updateOpportunityTitle = (title) => { state.programs[0].titleEn = title; };
function matches(row, condition) {
  if (!condition) return true;
  if (condition.op === "and") return condition.items.every((item) => matches(row, item));
  if (condition.op === "eq") return row[condition.column.field] === condition.value;
  if (condition.op === "in") return condition.values.includes(row[condition.column.field]);
  return true;
}
class Query {
  constructor(kind, table) { this.kind = kind; this.table = table; }
  from(table) { this.table = table; return this; }
  where(condition) { this.condition = condition; return this; }
  limit(count) { this.count = count; return this; }
  orderBy() { return this; }
  set(values) { this.values = values; return this; }
  values(values) { this.values = values; return this; }
  returning(fields) { this.fields = fields; return this; }
  then(resolve, reject) {
    return Promise.resolve().then(() => {
      const rows = state[this.table.__name];
      let selected = rows.filter((row) => matches(row, this.condition)).slice(0, this.count);
      if (this.kind === "insert") {
        const row = {
          id: Math.max(0, ...rows.map((item) => item.id || 0)) + 1,
          externalPostId: "", lastError: "", publishedAt: null,
          createdAt: new Date(), updatedAt: new Date(), ...this.values,
        };
        rows.push(row);
        selected = [row];
      }
      if (this.kind === "update") {
        for (const row of selected) Object.assign(row, this.values);
      }
      if (this.fields) {
        selected = selected.map((row) => Object.fromEntries(
          Object.entries(this.fields).map(([key, col]) => [key, row[col.field]]),
        ));
      }
      return selected;
    }).then(resolve, reject);
  }
}
export const db = {
  select: () => new Query("select"),
  insert: (table) => new Query("insert", table),
  update: (table) => new Query("update", table),
  transaction: (run) => run(db),
  execute: async () => [],
};
`;

const providerFixture = `
export class SocialProviderError extends Error {
  constructor(message, statusCode, outcomeUnknown = false) {
    super(message); this.statusCode = statusCode; this.outcomeUnknown = outcomeUnknown;
  }
}
let mode = "success";
let calls = 0;
export const setMode = (next) => { mode = next; };
export const getCalls = () => calls;
export const resetProvider = () => { mode = "success"; calls = 0; };
export async function publishToConnection(_connection, content) {
  calls++;
  if (mode === "failed") throw new SocialProviderError("تعذر النشر مؤقتاً لدى المنصة.", 500);
  if (mode === "forbidden") throw new SocialProviderError("المنصة رفضت صلاحية النشر.", 403);
  if (mode === "unknown") throw new SocialProviderError("نتيجة غير مؤكدة.", undefined, true);
  return content.text ? "external-post-1" : "";
}
export async function verifyTelegramBot() { return { accountId: "bot-1", accountName: "test", botName: "test" }; }
`;

test("social publishing routes enforce owner access, protect hidden content, dedupe, and retry only definite failures", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "misbar-social-routes-"));
  const routeFile = resolve(dirname(fileURLToPath(import.meta.url)), "socialPublishing.ts");
  const mocks: Record<string, string> = {
    "@workspace/db": fixtureDb,
    "drizzle-orm": `
      export const eq = (column, value) => ({op:"eq",column,value});
      export const and = (...items) => ({op:"and",items});
      export const inArray = (column, values) => ({op:"in",column,values});
      export const asc = () => null;
      export const sql = () => null;
    `,
    "../middlewares/ownerAuth": `
      export const requireManagedOwner = (req,res,next) =>
        req.headers["x-role"] === "owner" ? next() : res.status(403).json({error:"owner only"});
    `,
    "../lib/opportunityVisibility": `
      import { snapshot } from "@workspace/db";
      export async function getOpportunityVisibility() {
        return new Map([[1, snapshot().hiddenFields]]);
      }
    `,
    "../lib/siteContentSettings": `
      export async function getSiteContentSettings() {
        return {brand:{socialShareImageUrl:"https://srmaacademy.com/share.jpg"}};
      }
    `,
    "../lib/socialSecurity": `
      export const decryptSocialSecret = value => value;
      export const encryptSocialSecret = value => value;
    `,
    "../lib/socialProviders": providerFixture,
  };
  const source = `
    import express from "express";
    import socialPublishing from "${routeFile}";
    export { reset, snapshot, setHiddenFields, updateOpportunityTitle } from "@workspace/db";
    export { setMode, getCalls, resetProvider } from "../lib/socialProviders";
    export const app = express();
    app.use(express.json());
    app.use((req,_res,next) => { req.log = {error:()=>{}}; next(); });
    app.use("/api", socialPublishing);
  `;
  let server: any;
  try {
    const outfile = resolve(dir, "social-routes.cjs");
    await build({
      stdin: { contents: source, resolveDir: process.cwd() },
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [{
        name: "social-route-fixtures",
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
    server = fixture.app.listen(0, "127.0.0.1");
    await new Promise<void>((resolveReady) => server.once("listening", resolveReady));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const post = (path: string, body: object, role = "owner") =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": role },
        body: JSON.stringify(body),
      });

    fixture.reset();
    fixture.resetProvider();
    let response = await post("/admin/programs/1/social-posts", { connectionIds: [11] }, "public");
    assert.equal(response.status, 403);
    assert.equal(fixture.getCalls(), 0);

    fixture.reset();
    fixture.resetProvider();
    fixture.setHiddenFields(["title", "preview", "specialty", "image"]);
    response = await post("/admin/programs/1/social-posts", { connectionIds: [11] });
    assert.equal(response.status, 200);
    type PostResult = { results: Array<{ post: { id: number; status: string; content: string } }> };
    let result = await response.json() as PostResult;
    assert.equal(result.results[0]?.post.status, "published");
    assert.equal(result.results[0]?.post.content.includes("Private research title"), false);
    assert.equal(result.results[0]?.post.content.includes("Internal Medicine"), false);

    fixture.updateOpportunityTitle("Changed title after publishing");
    response = await post("/admin/programs/1/social-posts", { connectionIds: [11] });
    assert.equal(response.status, 200);
    const duplicateResult = await response.json() as PostResult;
    assert.equal(duplicateResult.results[0]?.post.status, "published");
    assert.equal(fixture.getCalls(), 1);
    assert.equal(fixture.snapshot().posts.length, 1);

    fixture.reset();
    fixture.resetProvider();
    fixture.setMode("failed");
    response = await post("/admin/programs/1/social-posts", { connectionIds: [11] });
    assert.equal(response.status, 207);
    const failedResult = await response.json() as PostResult;
    const failedPostId = failedResult.results[0]?.post.id;
    assert.equal(failedResult.results[0]?.post.status, "failed");
    fixture.setMode("success");
    response = await post(`/admin/social/posts/${failedPostId}/retry`, {});
    assert.equal(response.status, 200);
    const retried = await response.json() as { post: { status: string } };
    assert.equal(retried.post.status, "published");
    assert.equal(fixture.getCalls(), 2);

    fixture.reset();
    fixture.resetProvider();
    fixture.setMode("forbidden");
    response = await post("/admin/programs/1/social-posts", { connectionIds: [11] });
    assert.equal(response.status, 207);
    const forbiddenResult = await response.json() as PostResult;
    const forbiddenPostId = forbiddenResult.results[0]?.post.id;
    assert.equal(forbiddenResult.results[0]?.post.status, "failed");
    assert.equal(fixture.snapshot().connections[0]?.status, "needs_reauth");
    response = await post(`/admin/social/posts/${forbiddenPostId}/retry`, {});
    assert.equal(response.status, 409);
    assert.equal(fixture.getCalls(), 1);

    fixture.reset();
    fixture.resetProvider();
    fixture.setMode("unknown");
    response = await post("/admin/programs/1/social-posts", { connectionIds: [11] });
    assert.equal(response.status, 207);
    const unknownResult = await response.json() as PostResult;
    const unknownPostId = unknownResult.results[0]?.post.id;
    assert.equal(unknownResult.results[0]?.post.status, "unknown");
    response = await post(`/admin/social/posts/${unknownPostId}/retry`, {});
    assert.equal(response.status, 409);
    assert.equal(fixture.getCalls(), 1);
  } finally {
    server?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
