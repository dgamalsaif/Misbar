import { X } from "lucide-react";
import ParticipationInvoice from "@/components/ParticipationInvoice";
import { isFieldVisible } from "@/lib/opportunityVisibility";
import type { SiteContentSettings } from "@/lib/siteContentSettings";

export interface RegistrationInvoiceRecord {
  id: number;
  createdAt: string;
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  city: string;
  affiliation: string;
  specialization: string;
  researchId: number;
  researchTitle: string;
  hiddenFields?: string[];
  invoiceOriginalSar?: number | null;
  invoiceDiscountedSar?: number | null;
  invoiceTotalSeats?: number | null;
  invoiceRemainingSeats?: number | null;
  invoiceSpecialty?: string | null;
  invoiceJournalTarget?: string | null;
  paymentStatus?: "paid" | "unpaid";
  paymentPaidAt?: string | null;
}

export default function AdminRegistrationInvoiceDialog({
  registration,
  settings,
  onClose,
}: {
  registration: RegistrationInvoiceRecord;
  settings: SiteContentSettings;
  onClose: () => void;
}) {
  const visibleField = (id: string) => settings.registrationFields.find((field) => field.id === id)?.showParticipant !== false;
  const opportunityTitleVisible = isFieldVisible(registration, "title");
  const seatsVisible = isFieldVisible(registration, "seats");
  const researchTitle = opportunityTitleVisible ? registration.researchTitle : "فرصة بحثية";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="فاتورة تسجيل المشارك"
      onClick={onClose}
    >
      <div className="relative my-auto w-full max-w-4xl rounded-3xl bg-white p-3 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="invoice-screen-actions mb-2 flex justify-start">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الفاتورة"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <ParticipationInvoice
          registrationId={registration.id}
          createdAt={registration.createdAt}
          invoiceSettings={settings.invoiceSettings}
          watermarkSettings={settings.watermarkSettings}
          brand={settings.brand}
          language="ar"
          participant={{
            fullName: visibleField("fullName") ? registration.fullName : "",
            email: visibleField("email") ? registration.email : "",
            phone: visibleField("whatsapp") ? registration.whatsapp : "",
            country: visibleField("country") ? registration.country : "",
            city: visibleField("city") ? registration.city : "",
            affiliation: visibleField("affiliation") ? registration.affiliation : "",
            specialization: visibleField("specialization") ? registration.specialization : "",
          }}
          researchId={registration.researchId}
          researchTitle={researchTitle}
          showResearchReference={opportunityTitleVisible && isFieldVisible(registration, "code")}
          showFeeDetails={isFieldVisible(registration, "price")}
          showSeatDetails={seatsVisible}
          totalSeats={seatsVisible ? registration.invoiceTotalSeats ?? undefined : undefined}
          remainingSeats={seatsVisible ? registration.invoiceRemainingSeats ?? undefined : undefined}
          targetJournal={isFieldVisible(registration, "journal") ? registration.invoiceJournalTarget || "" : ""}
          specialty={isFieldVisible(registration, "specialty") ? registration.invoiceSpecialty || "" : ""}
          priceOriginalSar={registration.invoiceOriginalSar ?? undefined}
          priceDiscountedSar={registration.invoiceDiscountedSar ?? undefined}
          includedServices={[]}
          paymentStatus={registration.paymentStatus || "unpaid"}
          paymentPaidAt={registration.paymentPaidAt}
        />
      </div>
    </div>
  );
}
