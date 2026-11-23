import { useRef } from "react";
import { FileDown } from "lucide-react";
import type { BrandContactSettings, InvoiceSettings } from "@/lib/siteContentSettings";

interface Props {
  registrationId: number;
  createdAt: string;
  invoiceSettings: InvoiceSettings;
  brand: BrandContactSettings;
  language: string;
  participant: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    affiliation: string;
    specialization: string;
  };
  researchId: number;
  researchTitle: string;
  showResearchReference: boolean;
  showFeeDetails: boolean;
  showSeatDetails: boolean;
  totalSeats?: number;
  remainingSeats?: number;
  targetJournal?: string;
  specialty?: string;
  priceOriginalSar?: number;
  priceDiscountedSar?: number;
  includedServices: string[];
}

export default function ParticipationInvoice({
  registrationId,
  createdAt,
  invoiceSettings,
  brand,
  language,
  participant,
  researchId,
  researchTitle,
  showResearchReference,
  showFeeDetails,
  showSeatDetails,
  totalSeats,
  remainingSeats,
  targetJournal,
  specialty,
  priceOriginalSar,
  priceDiscountedSar,
  includedServices,
}: Props) {
  const printing = useRef(false);
  const isEnglish = language === "en";
  const date = new Date(createdAt);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const invoiceNumber = `${invoiceSettings.numberPrefix || "MIS"}-${validDate.getFullYear()}-${String(registrationId).padStart(6, "0")}`;
  const original = Number.isFinite(priceOriginalSar) && (priceOriginalSar ?? 0) >= 0 ? priceOriginalSar : undefined;
  const discounted = Number.isFinite(priceDiscountedSar) && (priceDiscountedSar ?? 0) >= 0 ? priceDiscountedSar : undefined;
  const amountDue = showFeeDetails ? (discounted ?? original) : undefined;
  const hasDiscount = showFeeDetails && original !== undefined && amountDue !== undefined && original > amountDue;
  const discountValue = hasDiscount ? original - amountDue! : 0;
  const discountPercent = hasDiscount ? Math.round((discountValue / original!) * 100) : 0;
  const issuerName = isEnglish
    ? invoiceSettings.issuerNameEn || brand.siteNameEn || "Misbar"
    : invoiceSettings.issuerNameAr || brand.siteNameAr || "مسبار";
  const logoUrl = invoiceSettings.logoUrl || (/\.mp4(?:[?#]|$)/i.test(brand.logoUrl) ? "" : brand.logoUrl);
  const opportunityLabel = researchTitle.trim() || (isEnglish ? "Research opportunity" : "فرصة بحثية");
  const formatDate = (value: Date) => new Intl.DateTimeFormat(
    isEnglish ? "en-GB" : "ar-SA-u-ca-gregory-nu-latn",
    { year: "numeric", month: "long", day: "numeric", calendar: "gregory" },
  ).format(value);
  const formatSar = (value: number) => new Intl.NumberFormat(isEnglish ? "en-SA" : "ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
  const printInvoice = () => {
    if (printing.current) return;
    printing.current = true;
    const previousTitle = document.title;
    document.title = invoiceNumber;
    document.body.classList.add("invoice-printing");
    let restoreTimer = 0;
    const restore = () => {
      if (!printing.current) return;
      printing.current = false;
      document.body.classList.remove("invoice-printing");
      document.title = previousTitle;
      window.clearTimeout(restoreTimer);
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.setTimeout(() => window.print(), 50);
    restoreTimer = window.setTimeout(restore, 30000);
  };
  const lines = [
    { label: isEnglish ? "Participant" : "المشارك", value: participant.fullName },
    { label: isEnglish ? "Email" : "البريد الإلكتروني", value: participant.email },
    { label: isEnglish ? "Phone" : "رقم التواصل", value: participant.phone },
    { label: isEnglish ? "Country" : "الدولة", value: participant.country },
    { label: isEnglish ? "City" : "المدينة", value: participant.city },
    { label: isEnglish ? "Affiliation" : "جهة الانتساب", value: participant.affiliation },
    { label: isEnglish ? "Specialization" : "التخصص", value: participant.specialization },
  ].filter((line) => line.value.trim());

  return (
    <div className="invoice-print-root mx-auto mt-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm sm:p-7" data-testid="participation-invoice" dir={isEnglish ? "ltr" : "rtl"} lang={isEnglish ? "en" : "ar"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={isEnglish ? "Organization logo" : "شعار المؤسسة"}
              onError={(event) => { event.currentTarget.style.display = "none"; }}
              className="h-14 w-14 rounded-lg object-contain"
            />
          )}
          <div>
            <p className="font-black text-slate-900">{issuerName}</p>
            {(isEnglish ? invoiceSettings.addressEn : invoiceSettings.addressAr) && (
              <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-600">
                {isEnglish ? invoiceSettings.addressEn : invoiceSettings.addressAr}
              </p>
            )}
          </div>
        </div>
        <div className="text-sm">
          <p className="font-black text-emerald-900">{isEnglish ? invoiceSettings.titleEn : invoiceSettings.titleAr}</p>
          <p className="mt-1 font-bold text-rose-700">{isEnglish ? "UNPAID" : "غير مدفوعة"}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
        <p><span className="font-bold text-slate-500">{isEnglish ? "Invoice no." : "رقم الفاتورة"}: </span><bdi className="font-bold text-slate-900">{invoiceNumber}</bdi></p>
        <p><span className="font-bold text-slate-500">{isEnglish ? "Date" : "التاريخ"}: </span>{formatDate(validDate)}</p>
        {invoiceSettings.phone && <p><span className="font-bold text-slate-500">{isEnglish ? "Phone" : "الهاتف"}: </span><bdi>{invoiceSettings.phone}</bdi></p>}
        {invoiceSettings.email && <p className="break-all"><span className="font-bold text-slate-500">{isEnglish ? "Email" : "البريد"}: </span>{invoiceSettings.email}</p>}
        {invoiceSettings.taxNumber && <p className="col-span-2"><span className="font-bold text-slate-500">{isEnglish ? "Tax number" : "الرقم الضريبي"}: </span><bdi>{invoiceSettings.taxNumber}</bdi></p>}
      </div>

      <h3 className="mb-2 text-sm font-black text-slate-800">{isEnglish ? "Participant details" : "بيانات المشارك"}</h3>
      <div className="mb-5 grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-2">
        {lines.map((line) => (
          <p key={line.label} className="break-words">
            <span className="font-bold text-slate-500">{line.label}: </span>{line.value}
          </p>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-black text-slate-800">{isEnglish ? "Description" : "تفاصيل الفاتورة"}</h3>
       <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-start justify-between gap-4 bg-slate-50 p-3 text-sm">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{isEnglish ? invoiceSettings.itemDescriptionEn : invoiceSettings.itemDescriptionAr}</p>
            <p className="mt-1 break-words text-xs text-slate-600">{opportunityLabel}</p>
             {specialty && <p className="mt-1 break-words text-xs text-slate-600"><span className="font-bold">{isEnglish ? "Specialty: " : "التخصص: "}</span>{specialty}</p>}
             {targetJournal && <p className="mt-1 break-words text-xs text-slate-600"><span className="font-bold">{isEnglish ? "Target journal: " : "المجلة المستهدفة: "}</span>{targetJournal}</p>}
            {showResearchReference && (
              <p className="mt-1 text-xs text-slate-500">
                {isEnglish ? `Opportunity reference: ${researchId}` : `رقم الفرصة: ${researchId}`}
              </p>
            )}
             {showSeatDetails && (typeof totalSeats === "number" || typeof remainingSeats === "number") && (
               <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700">
                 {isEnglish ? "Available seats after registration: " : "المقاعد المتاحة بعد تسجيلك: "}
                 {typeof remainingSeats === "number" && <bdi>{remainingSeats}</bdi>}
                 {typeof remainingSeats === "number" && typeof totalSeats === "number" && " / "}
                 {typeof totalSeats === "number" && <bdi>{totalSeats}</bdi>}
               </p>
             )}
            {includedServices.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs leading-5 text-slate-600">
                {includedServices.map((service, index) => <li key={`${index}-${service}`}>{service}</li>)}
              </ul>
            )}
          </div>
          {amountDue !== undefined && <bdi className="shrink-0 font-black text-slate-900">{formatSar(amountDue)}</bdi>}
        </div>
         {amountDue !== undefined && original !== undefined && (
           <div className="grid gap-2 border-t border-slate-200 p-3 text-xs text-slate-600">
             <p className="flex justify-between gap-3">
               <span>{isEnglish ? "Original fee" : "الرسوم قبل الخصم"}</span>
               <bdi className={hasDiscount ? "line-through" : "font-bold"}>{formatSar(original)}</bdi>
             </p>
             {hasDiscount && <p className="flex justify-between gap-3 font-bold text-emerald-800">
               <span>{isEnglish ? `Discount (${discountPercent}%)` : `الخصم (${discountPercent}٪)`}</span>
               <bdi>−{formatSar(discountValue)}</bdi>
             </p>}
           </div>
         )}
        {amountDue !== undefined ? (
          <div className="flex justify-between gap-3 border-t border-slate-200 p-3 text-sm font-black text-slate-900">
            <span>{isEnglish ? "Amount due — unpaid" : "المبلغ المطلوب — غير مدفوع"}</span>
            <bdi>{formatSar(amountDue)}</bdi>
          </div>
        ) : (
          <p className="border-t border-slate-200 p-3 text-xs text-slate-600">
            {isEnglish ? "Fee details are not shown for this opportunity." : "لم تُعرض الرسوم في إعدادات هذه الفرصة."}
          </p>
        )}
      </div>

       {(isEnglish ? invoiceSettings.applicabilityNoteEn : invoiceSettings.applicabilityNoteAr).trim() && (
         <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
           {isEnglish ? invoiceSettings.applicabilityNoteEn : invoiceSettings.applicabilityNoteAr}
         </p>
       )}

      <div className="mt-5 flex min-h-24 items-end justify-between gap-4">
        <p className="max-w-[70%] whitespace-pre-line text-xs leading-5 text-slate-600">
          {isEnglish ? invoiceSettings.footerEn : invoiceSettings.footerAr}
        </p>
        {invoiceSettings.stampUrl && (
          <img
            src={invoiceSettings.stampUrl}
            alt={isEnglish ? "Official stamp" : "الختم الرسمي"}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            className="h-20 w-20 shrink-0 object-contain"
          />
        )}
      </div>

      <div className="invoice-screen-actions mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={printInvoice}
          data-testid="button-save-invoice-pdf"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-black text-white hover:bg-emerald-900"
        >
          <FileDown size={17} />
          {isEnglish ? "Print or save as PDF" : "طباعة أو حفظ الفاتورة PDF"}
        </button>
      </div>
      <p className="invoice-screen-actions mt-2 text-center text-xs text-slate-500">
        {isEnglish ? "Choose “Save as PDF” in the print window." : "اختر «حفظ كملف PDF» من نافذة الطباعة."}
      </p>
    </div>
  );
}
