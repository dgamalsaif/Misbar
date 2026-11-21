import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import type { PublicPageId } from "@/lib/siteContentSettings";

/** Heading + description from settings.pages[id], plus the legacy free-text content block. */
export default function PageHero({ page, children }: { page: PublicPageId; children?: ReactNode }) {
  const { language } = useLanguage();
  const { data } = useSiteContentSettings();
  const p = data.pages[page];
  const title = language === "ar" ? p.titleAr : p.titleEn;
  const desc = language === "ar" ? p.descriptionAr : p.descriptionEn;
  const content = ((language === "ar" ? p.contentAr : p.contentEn) || "").trim();
  return (
    <section className="m-container pb-6 pt-8 md:pt-12" data-testid={`hero-${page}`}>
      <div className="max-w-3xl">
        <h1 className="m-h1 m-rise" data-testid={`text-${page}-title`}>{title}</h1>
        {desc && <p className="m-muted m-rise m-rise-2 mt-4 text-lg leading-8" data-testid={`text-${page}-description`}>{desc}</p>}
        {children}
      </div>
      {content && <div className="m-card m-rise mt-8 whitespace-pre-wrap border-s-4 border-[color:var(--m-gold)] p-6 leading-8" data-testid={`text-${page}-content`}>{content}</div>}
    </section>
  );
}
