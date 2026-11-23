import { useRef, type ReactNode } from "react";
import { CalendarDays, FileDown, FileText, Info, Mail, Phone, ReceiptText, UserRound } from "lucide-react";
import type { BrandContactSettings, InvoiceSettings, WatermarkSettings } from "@/lib/siteContentSettings";

interface Props {
  registrationId: number;
  createdAt: string;
  invoiceSettings: InvoiceSettings;
  watermarkSettings: WatermarkSettings;
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

function InvoiceSectionTab({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="invoice-section-tab flex items-center gap-3 rounded-t-2xl bg-[#0b3154] px-4 py-2 text-white sm:w-[17rem]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">{icon}</span>
      <div>
        <p className="text-sm font-black leading-5">{title}</p>
        <p className="text-[10px] leading-4 text-white/75">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ParticipationInvoice({
  registrationId,
  createdAt,
  invoiceSettings,
  watermarkSettings,
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
  const invoiceElement = useRef<HTMLDivElement>(null);
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
  const watermarkText = (isEnglish ? watermarkSettings.textEn : watermarkSettings.textAr).trim();
  const watermarkOpacity = Math.min(0.35, Math.max(0, watermarkSettings.opacity));
  const watermarkFontSize = Math.min(72, Math.max(12, watermarkSettings.fontSize * 4));
  const watermarkAngle = Math.min(45, Math.max(-45, watermarkSettings.angle));
  const opportunityLabel = showResearchReference
    ? researchTitle.trim() || (isEnglish ? "Research opportunity" : "فرصة بحثية")
    : (isEnglish ? "Research opportunity" : "فرصة بحثية");
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
    const invoice = invoiceElement.current;
    if (!invoice) return;

    printing.current = true;
    const previousTitle = document.title;
    document.title = invoiceNumber;
    const printCopy = invoice.cloneNode(true) as HTMLElement;
    printCopy.classList.add("invoice-print-copy");
    printCopy.setAttribute("aria-hidden", "true");
    printCopy.querySelectorAll(".invoice-screen-actions").forEach((element) => element.remove());
    document.body.appendChild(printCopy);
    document.body.classList.add("invoice-printing");
    let restoreTimer = 0;
    const restore = () => {
      if (!printing.current) return;
      printing.current = false;
      printCopy.remove();
      document.body.classList.remove("invoice-printing");
      document.title = previousTitle;
      window.clearTimeout(restoreTimer);
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.setTimeout(() => window.print(), 50);
    restoreTimer = window.setTimeout(restore, 30000);
  };
  const lines: Array<{ label: string; value: string; dir?: "ltr" | "auto" }> = [
    { label: isEnglish ? "Participant" : "المشارك", value: participant.fullName },
    { label: isEnglish ? "Email" : "البريد الإلكتروني", value: participant.email, dir: "ltr" as const },
    { label: isEnglish ? "Phone" : "رقم التواصل", value: participant.phone, dir: "ltr" as const },
    { label: isEnglish ? "Country" : "الدولة", value: participant.country },
    { label: isEnglish ? "City" : "المدينة", value: participant.city },
    { label: isEnglish ? "Affiliation" : "جهة الانتساب", value: participant.affiliation },
    { label: isEnglish ? "Specialization" : "التخصص", value: participant.specialization },
  ].filter((line) => line.value.trim());

  const sectionLabels = {
    participant: isEnglish ? "Participant information" : "بيانات المشارك",
    details: isEnglish ? "Invoice details" : "تفاصيل الفاتورة",
    summary: isEnglish ? "Invoice summary" : "ملخص الفاتورة",
    participantSubtitle: "Participant Information",
    detailsSubtitle: "Invoice Details",
    summarySubtitle: "Invoice Summary",
  };

  return (
    <div
      ref={invoiceElement}
      className="invoice-print-root relative mx-auto mt-6 w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-[#d5e0e9] bg-white text-right text-slate-800 shadow-[0_24px_70px_-38px_rgba(8,35,62,.45)]"
      data-testid="participation-invoice"
      dir={isEnglish ? "ltr" : "rtl"}
      lang={isEnglish ? "en" : "ar"}
    >
      {watermarkSettings.enabled && watermarkText && (
        <div
          className="invoice-watermark pointer-events-none absolute left-1/2 top-[48%] z-0 max-w-[90%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-black"
          aria-hidden="true"
          style={{
            color: watermarkSettings.color,
            opacity: watermarkOpacity,
            fontSize: `${watermarkFontSize}px`,
            transform: `translate(-50%, -50%) rotate(${watermarkAngle}deg)`,
          }}
        >
          {watermarkText}
        </div>
      )}
      <div className="relative z-10">
        <header className="invoice-header relative overflow-hidden bg-[#0b3154] px-5 py-5 text-white sm:px-8 sm:py-6">
          <div className="absolute -left-16 -top-28 h-64 w-64 rounded-full border-[22px] border-white/10" />
          <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full border-[32px] border-[#35bbb3]/35" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={isEnglish ? "Organization logo" : "شعار المؤسسة"}
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                  className="invoice-logo h-14 w-14 shrink-0 rounded-2xl border border-white/20 bg-white p-1 object-contain sm:h-20 sm:w-20"
                />
              )}
              <div className="min-w-0">
                <p className="text-base font-black leading-6 sm:text-xl">{issuerName}</p>
                <p className="mt-1 text-xs font-semibold text-white/85 sm:text-sm">
                  {isEnglish ? brand.siteNameAr || "أكاديمية مسبار للبحث والتطوير" : brand.siteNameEn || "MISBAR Academy for Research & Development"}
                </p>
                {(isEnglish ? invoiceSettings.addressEn : invoiceSettings.addressAr) && (
                  <p className="mt-1 hidden whitespace-pre-line text-[10px] text-white/70 sm:block">
                    {isEnglish ? invoiceSettings.addressEn : invoiceSettings.addressAr}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 border-r border-white/25 pr-4 text-center sm:pr-6">
              <p className="rounded-full border border-rose-200/50 bg-rose-500/15 px-3 py-1 text-[10px] font-black text-rose-100 sm:text-xs">
                {isEnglish ? "UNPAID" : "غير مدفوعة"}
              </p>
              <p className="mt-2 text-[10px] text-white/80 sm:text-xs">{isEnglish ? "UNPAID INVOICE" : "فاتورة غير مدفوعة"}</p>
            </div>
          </div>
          <div className="relative mx-auto mt-5 max-w-lg rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center shadow-lg">
            <p className="text-base font-black sm:text-xl">{isEnglish ? invoiceSettings.titleEn : invoiceSettings.titleAr}</p>
            <p className="text-xs font-semibold text-white/85 sm:text-sm">
              {isEnglish ? "Research Participation Invoice" : "Research Participation Invoice"}
            </p>
          </div>
        </header>

        <section className="invoice-meta relative mx-4 -mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-[#dce6ed] bg-[#f4f8fb] p-3 text-[10px] text-[#263d52] shadow-sm sm:mx-7 sm:grid-cols-4 sm:gap-3 sm:p-4 sm:text-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#0b5574]" />
            <span><b>{isEnglish ? "Date" : "التاريخ"}</b><br />{formatDate(validDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[#0b5574]" />
            <span><b>{isEnglish ? "Invoice no." : "رقم الفاتورة"}</b><br /><bdi>{invoiceNumber}</bdi></span>
          </div>
          {invoiceSettings.email && (
            <div className="flex min-w-0 items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#0b5574]" />
              <span className="min-w-0"><b>{isEnglish ? "Email" : "البريد الإلكتروني"}</b><br /><span dir="ltr" className="break-all">{invoiceSettings.email}</span></span>
            </div>
          )}
          {invoiceSettings.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-[#0b5574]" />
              <span><b>{isEnglish ? "Phone" : "الهاتف"}</b><br /><bdi dir="ltr">{invoiceSettings.phone}</bdi></span>
            </div>
          )}
          {invoiceSettings.taxNumber && (
            <p className="col-span-2 sm:col-span-4">
              <span className="font-bold">{isEnglish ? "Tax number: " : "الرقم الضريبي: "}</span><bdi>{invoiceSettings.taxNumber}</bdi>
            </p>
          )}
        </section>

        <section className="invoice-section relative mx-4 mt-5 sm:mx-7">
          <InvoiceSectionTab
            icon={<UserRound size={18} />}
            title={sectionLabels.participant}
            subtitle={sectionLabels.participantSubtitle}
          />
          <div className="invoice-participant-grid grid gap-x-6 gap-y-2 rounded-b-2xl border border-[#b7c9d6] bg-white/90 p-4 text-xs sm:grid-cols-3 sm:p-5">
            {lines.map((line) => (
              <p key={line.label} className="flex min-w-0 justify-between gap-2 border-b border-[#e9eef2] pb-1.5 sm:block">
                <span className="shrink-0 font-bold text-[#527086]">{line.label}</span>
                <span dir={line.dir} className="break-words font-semibold text-[#16334e] sm:mt-1 sm:block">{line.value}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="invoice-section relative mx-4 mt-5 sm:mx-7">
          <InvoiceSectionTab
            icon={<ReceiptText size={18} />}
            title={sectionLabels.details}
            subtitle={sectionLabels.detailsSubtitle}
          />
          <div className="invoice-details rounded-b-2xl border border-[#b7c9d6] bg-[#fbfdfe] p-4 sm:p-5">
            <div className="invoice-line-item grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold text-[#587287]">
                  {isEnglish ? invoiceSettings.itemDescriptionEn : invoiceSettings.itemDescriptionAr}
                </p>
                <p dir="auto" className="mt-2 break-words text-sm font-black leading-6 text-[#183550] sm:text-base">
                  {opportunityLabel}
                </p>
                {(specialty || targetJournal) && (
                  <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] font-semibold text-[#536c80] sm:text-xs">
                    {specialty && <span>{isEnglish ? "Specialty: " : "التخصص: "}{specialty}</span>}
                    {targetJournal && <span>{isEnglish ? "Target journal: " : "المجلة المستهدفة: "}{targetJournal}</span>}
                  </div>
                )}
                {showResearchReference && (
                  <p className="mt-2 text-[10px] font-bold text-[#536c80] sm:text-xs">
                    {isEnglish ? "Opportunity no.: " : "رقم الفرصة: "}<bdi>{researchId}</bdi>
                  </p>
                )}
                {showSeatDetails && (typeof totalSeats === "number" || typeof remainingSeats === "number") && (
                  <p className="mx-auto mt-3 max-w-md border-t border-[#c7d5df] pt-2 text-[10px] font-bold text-[#536c80]">
                    {isEnglish ? "Available seats after registration: " : "المقاعد المتاحة بعد تسجيلك: "}
                    {typeof remainingSeats === "number" && typeof totalSeats === "number"
                      ? <bdi dir="ltr">{remainingSeats} / {totalSeats}</bdi>
                      : typeof remainingSeats === "number"
                        ? <bdi dir="ltr">{remainingSeats}</bdi>
                        : typeof totalSeats === "number"
                          ? <bdi dir="ltr">{totalSeats}</bdi>
                          : null}
                  </p>
                )}
                {includedServices.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-[#d7e2e9] pt-3">
                    {includedServices.map((service, index) => (
                      <span key={`${index}-${service}`} className="rounded-full bg-[#edf4f7] px-3 py-1 text-[10px] font-semibold text-[#536c80]">
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {amountDue !== undefined && (
                <div className="invoice-opportunity-amount rounded-2xl bg-[#eef4f8] px-4 py-3 text-center text-[#173b5a]">
                  <p className="text-[10px] font-bold">{isEnglish ? "Participation fee" : "رسوم المشاركة"}</p>
                  <bdi dir="ltr" className="mt-1 block text-base font-black">{formatSar(amountDue)}</bdi>
                </div>
              )}
            </div>
            {amountDue !== undefined && original !== undefined && (
              <div className="invoice-fee-breakdown mt-3 grid gap-2 border-t border-[#d7e2e9] pt-3 text-xs text-[#536c80]">
                <p className="flex justify-between gap-3">
                  <span>{isEnglish ? "Fees before discount" : "الرسوم قبل الخصم"}</span>
                  <bdi dir="ltr" className={hasDiscount ? "line-through" : "font-bold"}>{formatSar(original)}</bdi>
                </p>
                {hasDiscount && (
                  <p className="flex justify-between gap-3 font-bold text-emerald-800">
                    <span>{isEnglish ? `Discount (${discountPercent}%)` : `الخصم (${discountPercent}٪)`}</span>
                    <bdi dir="ltr">−{formatSar(discountValue)}</bdi>
                  </p>
                )}
              </div>
            )}
            {amountDue !== undefined ? (
              <div className="invoice-amount-due mt-3 flex justify-between gap-3 rounded-xl bg-[#0b3154] px-4 py-2.5 text-sm font-black text-white">
                <span>{isEnglish ? "Amount due — unpaid" : "المبلغ المطلوب — غير مدفوع"}</span>
                <bdi dir="ltr">{formatSar(amountDue)}</bdi>
              </div>
            ) : (
              <p className="mt-3 border-t border-[#d7e2e9] pt-3 text-xs text-slate-600">
                {isEnglish ? "Fee details are not shown for this opportunity." : "لم تُعرض الرسوم في إعدادات هذه الفرصة."}
              </p>
            )}
          </div>
        </section>

        {(isEnglish ? invoiceSettings.applicabilityNoteEn : invoiceSettings.applicabilityNoteAr).trim() && (
          <section className="invoice-applicability-note relative mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-[#f0e4c8] bg-[#fbf6e9] p-3 text-[10px] leading-5 text-[#504832] sm:mx-7 sm:text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0b5574]" />
            <p>{isEnglish ? invoiceSettings.applicabilityNoteEn : invoiceSettings.applicabilityNoteAr}</p>
          </section>
        )}

        <section className="invoice-footer relative mx-4 my-5 flex items-center justify-between gap-4 sm:mx-7">
          {invoiceSettings.stampUrl ? (
            <img
              src={invoiceSettings.stampUrl}
              alt={isEnglish ? "Official stamp" : "الختم الرسمي"}
              onError={(event) => { event.currentTarget.style.display = "none"; }}
              className="invoice-stamp h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
            />
          ) : (
            <div className="invoice-stamp-placeholder invoice-screen-actions relative grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-[#0b5574]/50 px-3 text-center text-[9px] font-bold leading-4 text-[#0b5574]/70 sm:h-28 sm:w-28">
              {isEnglish ? "Upload the official stamp in invoice settings" : "ارفع الختم الرسمي من إعدادات الفاتورة"}
            </div>
          )}
          <div className="flex-1 text-center text-[10px] leading-5 text-[#425c70] sm:text-xs">
            <p className="whitespace-pre-line font-bold">{isEnglish ? invoiceSettings.footerEn : invoiceSettings.footerAr}</p>
            <p className="mt-1">{isEnglish ? "Issued upon registration in the research opportunity." : "صدر هذا المستند عند تسجيلك في الفرصة البحثية."}</p>
          </div>
        </section>

        <footer className="invoice-contact-footer relative overflow-hidden bg-[#092b4d] px-4 py-3 text-white sm:px-7">
          <div className="absolute -bottom-14 right-1/3 h-28 w-80 rounded-[50%] border-t-8 border-[#31aaa6]/70" />
          <div className="relative flex flex-wrap items-center justify-between gap-2 text-[9px] sm:text-xs">
            <span className="font-black">{issuerName}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/85">
              {invoiceSettings.phone && <bdi dir="ltr">{invoiceSettings.phone}</bdi>}
              {invoiceSettings.email && <bdi dir="ltr">{invoiceSettings.email}</bdi>}
            </span>
          </div>
        </footer>

        <div className="invoice-screen-actions p-4 text-center">
          <button
            type="button"
            onClick={printInvoice}
            data-testid="button-save-invoice-pdf"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3154] px-5 py-3 text-sm font-black text-white hover:bg-[#082641]"
          >
            <FileDown size={17} />
            {isEnglish ? "Print or save as PDF" : "طباعة أو حفظ الفاتورة PDF"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            {isEnglish ? "Choose “Save as PDF” in the print window." : "اختر «حفظ كملف PDF» من نافذة الطباعة."}
          </p>
        </div>
      </div>
    </div>
  );
}
