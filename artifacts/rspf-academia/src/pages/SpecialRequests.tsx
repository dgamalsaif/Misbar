import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import ServiceModal from "@/components/ServiceModal";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import PageHero from "@/components/PageHero";

export default function SpecialRequests() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const { t, language, direction } = useLanguage();
  const { data: settings } = useSiteContentSettings();
  const c = settings.experience.content.services;
  return (
    <div dir={direction} className="pb-10">
      <PageHero page="specialRequests" />
      <section className="m-container">
        {c.items.length === 0 ? (
          <div className="m-card p-10 text-center m-muted" data-testid="state-services-empty">{language === "ar" ? "لا توجد خدمات منشورة حالياً." : "No services published yet."}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.items.map((svc, i) => (
              <article key={i} className="m-card m-card-hover flex flex-col p-7" data-testid={`card-special-${i}`}>
                <span className="m-numeral text-sm">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold" style={{ fontFamily: "var(--m-font-heading)" }}>{svc.title[language]}</h3>
                <p className="m-muted mt-2 flex-1 leading-7">{svc.body[language]}</p>
                <button type="button" data-testid={`button-request-${i}`} onClick={() => { setSelectedService(svc.title[language]); setModalOpen(true); }} className="m-btn m-btn-ghost m-btn-sm mt-6 self-start">
                  {c.requestLabel[language]}
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="mt-10 rounded-[var(--m-radius)] bg-[color:var(--m-primary)] p-8 text-center text-[color:var(--m-surface)]">
          <h3 className="text-xl font-semibold">{c.contactTitle[language]}</h3>
          <p className="mt-2 text-[color:var(--m-surface)]/75">{c.contactBody[language]}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href={`https://wa.me/${settings.brand.whatsapp || "966562159258"}`} target="_blank" rel="noopener noreferrer" data-testid="button-special-whatsapp" className="m-btn m-btn-gold"><MessageCircle size={16} />{t("common.whatsapp")}</a>
            <a href={`https://t.me/${settings.brand.telegramUsername || "SRMAAcademy"}`} target="_blank" rel="noopener noreferrer" data-testid="button-special-telegram" className="m-btn m-btn-ghost !text-[color:var(--m-surface)]"><Send size={16} />Telegram</a>
          </div>
        </div>
      </section>
      <ServiceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} serviceName={selectedService} />
    </div>
  );
}
