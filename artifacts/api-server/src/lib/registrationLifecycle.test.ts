import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";

// Execute the real routes with an isolated transactional double, never live data.
const fixtureDb = `
export const registrationsTable = { name:"registrations", id:"id", coordinatorId:"coordinatorId", researchId:"researchId", status:"status", authorRole:"authorRole", customFields:"customFields", createdAt:"createdAt" };
export const registrationInvoiceRecordsTable = { name:"invoiceRecords", registrationId:"registrationId", paymentStatus:"paymentStatus", paymentPaidAt:"paymentPaidAt", paymentMarkedBy:"paymentMarkedBy" };
export const registrationPaymentEventsTable = { name:"paymentEvents", id:"id", registrationId:"registrationId", status:"status", recordedBy:"recordedBy", createdAt:"createdAt" };
export const coordinatorsTable = { name:"coordinators", id:"id", fullName:"fullName", email:"email", status:"status", createdAt:"createdAt" };
export const researchProgramsTable = { name:"programs", id:"id", titleAr:"titleAr", titleEn:"titleEn", category:"category", status:"status", seatsLeft:"seatsLeft" };
export const programCatalogBootstrapTable = { name:"bootstrap", key:"key" };
export const serviceRequestsTable = {name:"services",id:"id"};
export const ownerAccountsTable = {name:"owners"};
export const coordinatorPortalSettingsTable = {name:"portal"};
export const paymentRecordsTable = {name:"payments"};
export const socialSeatUpdateEventsTable = {name:"seatEvents"};
export const researchProgramArchiveRecordsTable = {name:"archives",researchId:"researchId",isArchived:"isArchived"};
const schema = { safeParse: data => ({success:true,data}), partial:()=>schema };
export const insertRegistrationSchema = schema;
export const insertServiceRequestSchema = schema;
let state = {}, failNext = false, paymentSchemaReady = true, archiveSchemaReady = true;
export function reset(rejected=false, schemaReady=true, archiveReady=true) {
 paymentSchemaReady = schemaReady;
  archiveSchemaReady = archiveReady;
 state = {
  programs:[{id:1,titleAr:"Study",titleEn:"Study",category:"training",status:"open",firstAuthorSeats:1,firstAuthorSeatsLeft:1,coAuthorSeats:14,coAuthorSeatsLeft:2,seatsLeft:3}],
 registrations: rejected ? [{id:1,researchId:1,coordinatorId:1,authorRole:"co_author",status:"rejected",customFields:{}}] : [],
 coordinators:[{id:1,fullName:"Fixture coordinator",email:"one@example.invalid",status:"active"}],
    bootstrap:[{key:"program-capacity-and-author-roles-v1"}],services:[],owners:[],portal:[],payments:[],seatEvents:[],invoiceRecords:[],paymentEvents:[],archives:[] };
 failNext=false;
}
export const snapshot=()=>structuredClone(state);
export const failUpdate=()=>{failNext=true};
export const archiveProgram=(researchId)=>state.archives.push({researchId,isArchived:true});
function matches(row, condition) {
 if (!condition) return true;
  if (condition.array) return condition.value.includes(row[condition.key]);
 if (condition.key) return row[condition.key]===condition.value;
 if (condition.args?.length && String(condition.text).includes("lower(")) return row.email?.toLowerCase()===condition.args.at(-1);
 return true;
}
class Query {
 constructor(kind,fields) {this.kind=kind;this.fields=fields}
 from(table){this.table=table;return this}
 where(condition){this.condition=condition;return this}
 limit(n){this.n=n;return this}
 orderBy(){return this}
 for(){return this}
 set(data){this.data=data;return this}
 values(data){this.data=data;return this}
 returning(fields){this.returnFields=fields;return this}
 then(resolve,reject){return Promise.resolve().then(()=>{
  const rows=state[this.table.name]||[];
  let selected=rows.filter(row=>matches(row,this.condition)).slice(0,this.n);
  if(this.kind==="insert"){
   const id=Math.max(0,...rows.map(row=>row.id||0))+1;
   const row={id,status:"active",createdAt:new Date().toISOString(),...this.data};
   rows.push(row);selected=[row];
  }
  if(this.kind==="update"){
   if(failNext && this.table.name==="programs"){failNext=false;throw new Error("fixture update failed")}
   for(const row of selected) Object.assign(row,this.data);
  }
  if(this.kind==="delete") state[this.table.name]=rows.filter(row=>!selected.includes(row));
  const fields=this.returnFields||this.fields;
  return selected.map(row=>fields?Object.fromEntries(Object.entries(fields).map(([key,col])=>[key,row[col]])):{...row});
 }).then(resolve,reject)}
}
export const db={
 select:fields=>new Query("select",fields),insert:table=>new Query("insert").from(table),
 update:table=>new Query("update").from(table),delete:table=>new Query("delete").from(table),
  execute:async query=>{const text=String(query?.text||"");if(text.includes("research_program_archive_records"))return{rows:[{available:archiveSchemaReady}]};return text.includes("to_regclass")?{rows:[{invoices_ready:paymentSchemaReady,events_ready:paymentSchemaReady}]}:[]},transaction:async fn=>{const before=structuredClone(state);try{return await fn(db)}catch(e){state=before;throw e}}
};
`;

test("real registration/coordinator handlers: lifecycle, rollback, former-student preservation and access revocation", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "srma-lifecycle-"));
  const mocks: Record<string, string> = {
    "@workspace/db": fixtureDb,
     "drizzle-orm": `export const eq=(key,value)=>({key,value});export const inArray=(key,value)=>({key,value,array:true});export const desc=()=>null;export const sql=(s,...args)=>({text:s.join("?"),args});`,
    "../middlewares/ownerAuth": `export const getManagedOwner=async req=>req.headers["x-role"]==="owner"?{}:null;export const requireManagedOwner=(req,res,next)=>req.headers["x-role"]==="owner"?next():res.status(403).json({error:"owner only"});`,
     "./ownerAuth": `export const getManagedOwner=async req=>req.headers["x-role"]==="owner"?{}:null;export const requireManagedOwner=(req,res,next)=>{if(req.headers["x-role"]!=="owner")return res.status(403).json({error:"owner only"});res.locals.owner={email:"owner@example.invalid"};next()};`,
    "../lib/mailer": `export const sendServiceRequestEmail=async()=>{};`,
    "../lib/siteContentSettings": `export const getSiteContentSettings=async()=>({registrationFields:[],feeAndTaskAgreementSettings:{enabled:false},specialtyOptions:[]});`,
    "../lib/registrationCompatibility": `export const normalizeRegistrationAnswers=x=>x;export const insertCompatibleRegistration=async(tx,table,data)=>(await tx.insert(table).values(data).returning())[0];`,
  };
  const source = `
import express from "express";
import submissions from "${resolve("artifacts/api-server/src/routes/submissions.ts")}";
import admin from "${resolve("artifacts/api-server/src/routes/admin.ts")}";
import {createSession} from "${resolve("artifacts/api-server/src/middlewares/coordinatorAuth.ts")}";
export {reset,snapshot,failUpdate,archiveProgram} from "@workspace/db";
export const app=express();app.use(express.json());app.use((req,res,next)=>{req.log={error:()=>{}};req.cookies=req.headers["x-role"]==="coordinator"?{srma_coordinator_session:createSession("coordinator",1)}:{};next()});app.use("/api",submissions,admin);
`;
  let server: any;
  try {
    const out = resolve(dir, "routes.cjs");
    await build({ stdin: { contents: source, resolveDir: process.cwd() }, outfile: out, bundle: true, platform: "node", format: "cjs", logLevel: "silent", plugins: [{
      name: "isolated-test-data", setup(builder) {
        builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: "fixture" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }));
      },
    }] });
    const fixture = createRequire(import.meta.url)(out);
    server = fixture.app.listen(0, "127.0.0.1");
    await new Promise<void>(done => server.once("listening", done));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = (path: string, method = "GET", body?: object, role = "owner") =>
      fetch(base + path, { method, headers: { "Content-Type": "application/json", "x-role": role }, body: body ? JSON.stringify(body) : undefined });
    const registration = { researchId: 1, fullName: "Fixture Student", email: "student@example.invalid", orcid: "https://orcid.org/0000-0002-1825-0097", authorRole: "co_author", customFields: { __seatReservation: "released" } };
    fixture.reset();
    let response = await request("/registrations", "POST", { ...registration, orcid: "not-an-orcid" }, "public");
    assert.equal(response.status, 400);
    assert.equal(fixture.snapshot().registrations.length, 0);

    fixture.reset();
    fixture.archiveProgram(1);
    response = await request("/registrations", "POST", registration, "public");
    assert.equal(response.status, 400);
    assert.equal(fixture.snapshot().registrations.length, 0);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 3);

    fixture.reset();
    response = await request("/registrations", "POST", registration, "public");
    assert.equal(response.status, 201);
    const student = await response.json() as { id: number; remainingSeats: number };
    assert.equal(student.remainingSeats, 2);
    assert.equal(fixture.snapshot().seatEvents.length, 1);
    assert.equal(fixture.snapshot().seatEvents[0].seatsLeft, 2);
    assert.equal(fixture.snapshot().seatEvents[0].registrationId, student.id);
    assert.equal(fixture.snapshot().registrations[0].orcid, "0000-0002-1825-0097");
    assert.equal(fixture.snapshot().invoiceRecords[0].registrationId, student.id);
    assert.equal(fixture.snapshot().invoiceRecords[0].paymentStatus, "unpaid");
    assert.equal((await request(`/registrations/${student.id}/payment`, "PATCH", { status: "paid" }, "coordinator")).status, 403);
    response = await request(`/registrations/${student.id}/payment`, "PATCH", { status: "paid" });
    assert.equal(response.status, 200);
    const paid = await response.json() as { paymentStatus: string; paymentMarkedBy: string };
    assert.equal(paid.paymentStatus, "paid");
    assert.equal(paid.paymentMarkedBy, "owner@example.invalid");
    assert.equal(fixture.snapshot().registrations[0].status, "pending");
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 2);
    assert.equal(fixture.snapshot().paymentEvents.length, 1);
    assert.equal((await request(`/registrations/${student.id}/payment`, "PATCH", { status: "paid" })).status, 200);
    assert.equal(fixture.snapshot().paymentEvents.length, 1);
    response = await request("/registrations");
    assert.equal(response.status, 200);
    const listed = await response.json() as Array<{ id: number; paymentStatus: string; paymentHistory: unknown[]; paymentWorkflowAvailable: boolean }>;
    assert.equal(listed[0].paymentWorkflowAvailable, true);
    assert.equal(listed[0].paymentStatus, "paid");
    assert.equal(listed[0].paymentHistory.length, 1);
    response = await request(`/registrations/${student.id}/payment`, "PATCH", { status: "unpaid" });
    assert.equal(response.status, 200);
    assert.equal(fixture.snapshot().paymentEvents.length, 2);
    assert.equal((await request(`/registrations/${student.id}`, "PATCH", { orcid: "not-an-orcid" })).status, 400);
    assert.equal(fixture.snapshot().registrations[0].customFields.__seatReservation, undefined);
    assert.equal((await request(`/registrations/${student.id}/status`, "PATCH", { status: "rejected" })).status, 200);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 3);
    assert.equal((await request(`/registrations/${student.id}/status`, "PATCH", { status: "rejected" })).status, 200);
    assert.equal((await request(`/registrations/${student.id}`, "DELETE")).status, 204);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 3);
    assert.equal((await request(`/registrations/${student.id}`, "DELETE")).status, 404);
    fixture.reset();
    fixture.failUpdate();
    assert.equal((await request("/registrations", "POST", registration, "public")).status, 500);
    assert.equal(fixture.snapshot().registrations.length, 0);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 3);
    assert.equal(fixture.snapshot().seatEvents.length, 0);
    fixture.reset(true);
    assert.equal((await request("/registrations/1", "DELETE")).status, 204);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 4);
    fixture.reset();
    response = await request("/coordinator/registrations", "POST", registration, "coordinator");
    assert.equal(response.status, 201);
    assert.equal((await request("/admin/coordinators/1", "PATCH", { status: "disabled" })).status, 200);
    assert.equal((await request("/registrations", "GET", undefined, "coordinator")).status, 401);
    assert.equal((await request("/admin/coordinators/1", "DELETE")).status, 204);
    assert.equal(fixture.snapshot().registrations.length, 1);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 2);
    assert.equal((await request("/registrations", "GET", undefined, "coordinator")).status, 401);
    assert.equal((await request("/admin/coordinators", "POST", { fullName: "New Fixture", email: "fixture@example.invalid", phone: "+966500000000", affiliation: "Test" })).status, 201);
    assert.equal((await request("/admin/coordinators", "POST", { fullName: "New Fixture", email: "FIXTURE@example.invalid", phone: "+966500000000", affiliation: "Test" })).status, 409);
    fixture.reset(false, false);
    response = await request("/registrations", "POST", registration, "public");
    assert.equal(response.status, 201);
    assert.equal(fixture.snapshot().registrations.length, 1);
    assert.equal(fixture.snapshot().invoiceRecords.length, 0);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 2);
    assert.equal((await request("/registrations/1/payment", "PATCH", { status: "paid" })).status, 503);
    assert.equal(fixture.snapshot().programs[0].seatsLeft, 2);
  } finally {
    if (server) await new Promise<void>(done => server.close(done));
    await rm(dir, { recursive: true, force: true });
  }
});