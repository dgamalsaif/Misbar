import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildInvoiceShareMessage, createSinglePagePdfFromJpeg, formatInvoiceNumber } from "./invoiceSharing";

test("invoice sharing message combines participant and opportunity details with invoice amounts", () => {
  const message = buildInvoiceShareMessage({
    invoiceNumber: "MIS-2026-000042",
    participant: {
      fullName: "د. أحمد",
      email: "doctor@example.com",
      phone: "+966 55 123 4567",
      country: "السعودية",
      city: "الرياض",
      affiliation: "مستشفى",
      specialization: "طب الأسرة",
    },
    researchId: 42,
    researchTitle: "Research title",
    showResearchReference: true,
    showFeeDetails: true,
    showSeatDetails: true,
    totalSeats: 10,
    remainingSeats: 9,
    targetJournal: "Target journal",
    specialty: "Research specialty",
    priceOriginalSar: 1200,
    priceDiscountedSar: 900,
    includedServices: ["Statistical analysis"],
    authorRole: "مؤلف مشارك",
    language: "ar",
  });

  assert.match(message, /MIS-2026-000042/);
  assert.match(message, /doctor@example\.com/);
  assert.match(message, /Research title/);
  assert.match(message, /Target journal/);
  assert.match(message, /المقاعد المتبقية: 9 \/ 10/);
  assert.match(message, /المبلغ المطلوب — غير مدفوع/);
  assert.match(message, /مؤلف مشارك/);
});

test("hidden opportunity details and hidden participant fields are not added to the WhatsApp message", () => {
  const message = buildInvoiceShareMessage({
    invoiceNumber: "MIS-2026-000001",
    participant: { fullName: "", email: "", phone: "", country: "", city: "", affiliation: "", specialization: "" },
    researchId: 1,
    researchTitle: "فرصة بحثية",
    showResearchReference: false,
    showFeeDetails: false,
    showSeatDetails: false,
    targetJournal: "",
    specialty: "",
    language: "ar",
  });
  assert.doesNotMatch(message, /رقم الفرصة|المجلة المستهدفة|الرسوم قبل الخصم|المقاعد المتبقية/);
  assert.match(message, /فرصة بحثية/);
});

test("invoice number follows the registration date and configured prefix", () => {
  assert.equal(formatInvoiceNumber("MIS", "2026-11-24T10:00:00.000Z", 42), "MIS-2026-000042");
});

test("single-page PDF builder emits one page with a valid cross-reference offset", async () => {
  const pdf = createSinglePagePdfFromJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 640, 900);
  assert.equal(pdf.type, "application/pdf");
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  const contents = new TextDecoder().decode(bytes);
  assert.match(contents, /^%PDF-1\.4/);
  assert.match(contents, /\/Count 1/);
  assert.match(contents, /\/Subtype \/Image/);
  const xrefOffset = Number(contents.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(new TextDecoder().decode(bytes.subarray(xrefOffset, xrefOffset + 4)), "xref");
  assert.match(contents, /%%EOF$/);
});
