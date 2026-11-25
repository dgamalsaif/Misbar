import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const fixtureDb = `
export const researchProgramsTable = { name:"programs", ...Object.fromEntries(["id","titleAr","titleEn","specialtyAr","specialtyEn","category","status","seatsLeft","totalSeats","createdAt","updatedAt","imagePath","country","applicationDeadline","descriptionAr","descriptionEn","priceOriginalSar","priceDiscountedSar","journalTarget","journalIssn","journalPubmed","journalScopus","journalWos","indexedIn","benefits","duration","supervisor","researchGroupUrl"].map(key=>[key,key])) };
export const registrationsTable = { name:"registrations", researchId:"researchId" };
export const researchProgramArchiveRecordsTable = { name:"archives", researchId:"researchId", canonicalResearchId:"canonicalResearchId", previousStatus:"previousStatus", isArchived:"isArchived", archivedAt:"archivedAt", archivedBy:"archivedBy", restoredAt:"restoredAt", restoredBy:"restoredBy" };
export const programCatalogBootstrapTable = { name:"bootstrap", key:"key" };
export const coordinatorPortalSettingsTable = { name:"portal", key:"key", value:"value", updatedAt:"updatedAt" };
export const insertResearchProgramSchema = { safeParse:data=>({success:true,data,issues:[]}), partial(){return this} };
let state = {};
export function reset() {
  const now = new Date("2026-01-01T00:00:00.000Z");
  state = {
    programs: [
      { id:1,titleAr:"دراسة القلب لدى البالغين",titleEn:"Cardiac outcomes in adults",specialtyAr:"طب القلب",specialtyEn:"Cardiology",category:"active",status:"open",seatsLeft:7,totalSeats:15,createdAt:now,updatedAt:now,imagePath:null,country:"",applicationDeadline:null,descriptionAr:"",descriptionEn:"",priceOriginalSar:1500,priceDiscountedSar:1000,journalTarget:"",journalIssn:"",journalPubmed:"",journalScopus:"",journalWos:"",indexedIn:"",benefits:"",duration:"",supervisor:"",researchGroupUrl:"" },
      { id:2,titleAr:"دراسة القلب لدى البالغين",titleEn:"CARDIAC OUTCOMES IN ADULTS",specialtyAr:"طب القلب",specialtyEn:"CARDIOLOGY",category:"active",status:"open",seatsLeft:3,totalSeats:15,createdAt:now,updatedAt:now,imagePath:null,country:"",applicationDeadline:null,descriptionAr:"",descriptionEn:"",priceOriginalSar:1500,priceDiscountedSar:1000,journalTarget:"",journalIssn:"",journalPubmed:"",journalScopus:"",journalWos:"",indexedIn:"",benefits:"",duration:"",supervisor:"",researchGroupUrl:"" },
    ],
    registrations:[{ id:91,researchId:2,status:"pending" }],
    archives:[],
    bootstrap:[],
    portal:[],
  };
}
export const snapshot=()=>structuredClone(state);
function matches(row, condition) {
  if (!condition) return true;
  if (condition.array) return condition.value.includes(row[condition.key]);
  if (condition.key) return row[condition.key]===condition.value;
  return true;
}
class Query {
  constructor(kind, fields) { this.kind=kind; this.fields=fields; }
  from(table) { this.table=table; return this; }
  where(condition) { this.condition=condition; return this; }
  limit(count) { this.count=count; return this; }
  orderBy() { return this; }
  for() { return this; }
  set(data) { this.data=data; return this; }
  values(data) { this.data=data; return this; }
  returning(fields) { this.returnFields=fields; return this; }
  then(resolve,reject) {
    return Promise.resolve().then(()=>{
      const rows=state[this.table.name]||[];
      let selected=rows.filter(row=>matches(row,this.condition));
      if(this.count!==undefined) selected=selected.slice(0,this.count);
      if(this.kind==="insert") {
        const values=Array.isArray(this.data)?this.data:[this.data];
        selected=values.map(value=>{
          const row=this.table.name==="archives"
            ? {isArchived:true,archivedAt:new Date("2026-01-02T00:00:00.000Z"),restoredAt:null,restoredBy:null,...value}
            : value;
          rows.push(row);
          return row;
        });
      }
      if(this.kind==="update") for(const row of selected) Object.assign(row,this.data);
      if(this.kind==="delete") state[this.table.name]=rows.filter(row=>!selected.includes(row));
      const fields=this.returnFields||this.fields;
      return selected.map(row=>fields?Object.fromEntries(Object.entries(fields).map(([key,column])=>[key,row[column]])):{...row});
    }).then(resolve,reject);
  }
}
export const db={
  select:fields=>new Query("select",fields),
  insert:table=>new Query("insert").from(table),
  update:table=>new Query("update").from(table),
  delete:table=>new Query("delete").from(table),
  execute:async query=>String(query?.text||"").includes("research_program_archive_records")?{rows:[{available:true}]}:[],
  transaction:async fn=>{const before=structuredClone(state);try{return await fn(db)}catch(error){state=before;throw error}},
};
`;

test("owner can archive a verified duplicate without deleting its registrations or changing seats", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "srma-program-duplicates-"));
  const mocks: Record<string, string> = {
    "@workspace/db": fixtureDb,
    "drizzle-orm": `export const eq=(key,value)=>({key,value});export const inArray=(key,value)=>({key,value,array:true});export const desc=()=>null;export const sql=(parts,...args)=>({text:parts.join("?"),args});`,
    "sharp": `export default ()=>({resize(){return this},png(){return this},toBuffer:async()=>Buffer.alloc(0)});`,
    "../middlewares/coordinatorAuth": `export const requireOwner=(req,res,next)=>req.headers["x-role"]==="owner"?(res.locals.owner={email:"owner@example.invalid"},next()):res.status(403).json({error:"owner only"});export const getStaffSession=async req=>req.headers["x-role"]==="coordinator"?{role:"coordinator"}:null;`,
    "../middlewares/ownerAuth": `export const getManagedOwner=async req=>req.headers["x-role"]==="owner"?{email:"owner@example.invalid"}:null;`,
    "../lib/registrationSeats": `export const holdsSeat=()=>true;`,
    "../lib/siteContentSettings": `export const getSiteContentSettings=async()=>({requiredOpportunityFields:[],brand:{siteNameEn:"Misbar"}});`,
    "../lib/opportunityDisplay": `export const getEnglishOpportunityTitle=p=>p.titleEn;export const getOpportunityShareSummary=p=>({title:p.titleEn,specialty:p.specialtyEn,heading:"Research"});`,
    "../lib/researchOpportunityImport": `export const PROGRAM_CATALOG_LOCK_ID=902173;export const importResearchOpportunities=async()=>({});export const addImportedSpecialties=async()=>[];`,
    "../lib/researchImageStorage": `export class ResearchImageStorageError extends Error{};export class ResearchImageValidationError extends Error{};export const getResearchImageBytes=async()=>null;export const getResearchImageUrl=async()=>null;export const resolveResearchImageUploadToken=async()=>null;export const uploadResearchImage=async()=>null;`,
    "../lib/programCapacity": `export const ensureProgramCapacityModel=async()=>{};export const PROGRAM_CAPACITY_LOCK_NAMESPACE=4219000;`,
    "../lib/researchCatalogSeatSnapshot": `export const applyResearchCatalogSeatSnapshot=async()=>{};export const researchCatalogDisplayOrder=()=>0;`,
    "../lib/opportunityVisibility": `export const getOpportunityIncludedServices=async()=>new Map();export const getOpportunityVisibility=async()=>new Map();export const saveOpportunityIncludedServices=async()=>{};export const saveOpportunityVisibility=async()=>{};export const validateHiddenFields=x=>x;`,
    "../lib/opportunityVisibilityFields": `export const DEFAULT_HIDDEN_OPPORTUNITY_FIELDS=[];export const validateIncludedServices=x=>x;`,
    "../lib/batchProgramUpdate": `export class BatchProgramValidationError extends Error{};export const validateBatchProgramScope=x=>x;export const validateBatchProgramUpdates=x=>x;`,
  };
    const programsRoutePath = resolve(dirname(fileURLToPath(import.meta.url)), "programs.ts");
    const source = `
import express from "express";
import programs from "${programsRoutePath}";
export {reset,snapshot} from "@workspace/db";
export const app=express();app.use(express.json());app.use((req,res,next)=>{req.log={error:()=>{},warn:()=>{}};next()});app.use("/api",programs);
`;
  let server: any;
  try {
    const output = resolve(dir, "programs.cjs");
    await build({
      stdin: { contents: source, resolveDir: process.cwd() },
      outfile: output,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [{
        name: "duplicate-review-fixture",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) => mocks[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: mocks[args.path]!, loader: "js" }));
        },
      }],
    });
    const fixture = createRequire(import.meta.url)(output);
    server = fixture.app.listen(0, "127.0.0.1");
    await new Promise<void>((resolveListening) => server.once("listening", resolveListening));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = (path: string, method = "GET", body?: object, role = "public") => fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", "x-role": role },
      body: body ? JSON.stringify(body) : undefined,
    });

    fixture.reset();
    const before = fixture.snapshot();
    assert.equal((await request("/programs/duplicates")).status, 403);
    let response = await request("/programs/duplicates", "GET", undefined, "owner");
    assert.equal(response.status, 200);
    const review = await response.json() as { archiveAvailable: boolean; groups: Array<{ activeCount: number; opportunities: Array<{ id: number; registrationCount: number }> }> };
    assert.equal(review.archiveAvailable, true);
    assert.equal(review.groups.length, 1);
    assert.equal(review.groups[0]?.activeCount, 2);
    assert.equal(review.groups[0]?.opportunities.find((item) => item.id === 2)?.registrationCount, 1);

    response = await request("/programs", "POST", {
      category: "active",
      titleAr: "دراسةُ القلب لدى البالغين",
      titleEn: "CARDIAC OUTCOMES IN ADULTS",
      specialtyAr: "طب القلب",
      specialtyEn: "cardiology",
      status: "open",
    }, "owner");
    assert.equal(response.status, 409);
    const duplicateReply = await response.json() as { matchedOpportunity?: { id: number } };
    assert.equal(duplicateReply.matchedOpportunity?.id, 1);
    assert.equal(fixture.snapshot().programs.length, 2);

    assert.equal((await request("/programs/2/archive", "PATCH", { archived: true, canonicalId: 1 }, "coordinator")).status, 403);
    assert.equal((await request("/programs/2/archive", "PATCH", { archived: true, canonicalId: 3 }, "owner")).status, 409);
    response = await request("/programs/2/archive", "PATCH", { archived: true, canonicalId: 1 }, "owner");
    assert.equal(response.status, 200);
    const archivedState = fixture.snapshot();
    assert.equal(archivedState.programs.length, before.programs.length);
    assert.deepEqual(archivedState.registrations, before.registrations);
    assert.deepEqual(archivedState.programs.map((program: any) => program.seatsLeft), before.programs.map((program: any) => program.seatsLeft));
    assert.equal(archivedState.archives[0]?.isArchived, true);

    assert.equal((await request("/programs/2/archive", "PATCH", { archived: false }, "owner")).status, 409);
    response = await request("/programs/2/archive", "PATCH", { archived: false, restoreAsDraft: true }, "owner");
    assert.equal(response.status, 200);
    const restoredState = fixture.snapshot();
    assert.equal(restoredState.programs[1]?.status, "draft");
    assert.deepEqual(restoredState.registrations, before.registrations);
    assert.deepEqual(restoredState.programs.map((program: any) => program.seatsLeft), before.programs.map((program: any) => program.seatsLeft));
    assert.equal(restoredState.archives[0]?.isArchived, false);
  } finally {
    if (server) await new Promise<void>((done) => server.close(done));
    await rm(dir, { recursive: true, force: true });
  }
});
