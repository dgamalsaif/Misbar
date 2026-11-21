import { useState } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import { getContactUsHref } from "@/lib/siteContentSettings";
import PageHero from "@/components/PageHero";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const { language, direction } = useLanguage();
  const { data } = useSiteContentSettings();
  const c = data.experience.content.faq;
  const contact = getContactUsHref(data.brand);
  return (
    <div dir={direction} className="pb-10">
      <PageHero page="faq" />
      <section className="m-container max-w-3xl">
        {c.items.length === 0 ? (
          <div className="m-card p-10 text-center m-muted" data-testid="state-faq-empty">{language === "ar" ? "لا توجد أسئلة منشورة حالياً." : "No questions published yet."}</div>
        ) : (
          <div className="grid gap-3">
            {c.items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="m-card overflow-hidden" data-testid={`faq-item-${i}`}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start font-semibold" data-testid={`button-faq-${i}`}>
                    {item.q[language]}
                    <Plus size={18} className={`shrink-0 text-[color:var(--m-gold)] transition-transform ${isOpen ? "rotate-45" : ""}`} />
                  </button>
                  {isOpen && <p className="m-muted m-rise whitespace-pre-wrap px-6 pb-6 leading-8">{item.a[language]}</p>}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-10 rounded-[var(--m-radius)] bg-[color:var(--m-gold-soft)] p-8 text-center">
          <h2 className="text-xl font-semibold">{c.contactTitle[language]}</h2>
          <p className="m-muted mt-2">{c.contactBody[language]}</p>
          <a href={contact.href} target={contact.isExternal ? "_blank" : undefined} rel={contact.isExternal ? "noopener noreferrer" : undefined} className="m-btn m-btn-primary mt-5" data-testid="link-faq-contact">{language === "ar" ? contact.labelAr : contact.labelEn}</a>
        </div>
      </section>
    </div>
  );
}
