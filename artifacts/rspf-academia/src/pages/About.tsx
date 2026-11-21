import { Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import PageHero from "@/components/PageHero";

export default function About() {
  const { language, direction } = useLanguage();
  const { data } = useSiteContentSettings();
  const c = data.experience.content.about;
  return (
    <div dir={direction} className="pb-10">
      <PageHero page="about">
        {c.intro[language] && <p className="m-rise m-rise-3 mt-5 leading-8" data-testid="text-about-intro">{c.intro[language]}</p>}
      </PageHero>
      {c.sections.length > 0 && (
        <section className="m-section m-container">
          <h2 className="m-h2">{c.sectionsTitle[language]}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {c.sections.map((s, i) => (
              <article key={i} className="m-card p-7" data-testid={`card-about-section-${i}`}>
                <h3 className="text-xl font-semibold" style={{ fontFamily: "var(--m-font-heading)" }}>{s.title[language]}</h3>
                <p className="m-muted mt-3 leading-7">{s.body[language]}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {c.values.length > 0 && (
        <section className="m-section bg-[color:var(--m-primary)] text-[color:var(--m-surface)]">
          <div className="m-container">
            <h2 className="m-h2">{c.valuesTitle[language]}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {c.values.map((v, i) => (
                <li key={i} data-testid={`item-about-value-${i}`}>
                  <span className="m-numeral text-sm">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-lg font-semibold">{v.title[language]}</h3>
                  <p className="mt-2 leading-7 text-[color:var(--m-surface)]/75">{v.body[language]}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      {c.offers.length > 0 && (
        <section className="m-section m-container">
          <h2 className="m-h2">{c.offersTitle[language]}</h2>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {c.offers.map((o, i) => (
              <li key={i} className="m-card flex items-center gap-3 px-5 py-4" data-testid={`item-about-offer-${i}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-gold-soft)] text-[color:var(--m-primary)]"><Check size={15} /></span>
                {o[language]}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
