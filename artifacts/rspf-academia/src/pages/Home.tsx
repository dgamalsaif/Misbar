import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ArrowRight, Award, BookOpenText, CalendarClock, Check, ChevronDown,
  ClipboardCheck, FlaskConical, HelpCircle, Microscope, RefreshCw, Users,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import type { ResearchOpportunity } from "@/lib/researchData";
import { LINKABLE_ROUTES, type HomeSectionId } from "../../../../lib/site-experience";

type ProgramsState = { status: "loading" } | { status: "error" } | { status: "ready"; items: ResearchOpportunity[] };

function usePrograms() {
  const [state, setState] = useState<ProgramsState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch("/api/programs", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: unknown) => {
        if (!alive) return;
        const list = Array.isArray(data) ? (data as ResearchOpportunity[]) : [];
        const open = list
          .filter((p) => p.status === "open" && (p.category || "active") === "active")
          .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));
        setState({ status: "ready", items: open });
      })
      .catch(() => alive && setState({ status: "error" }));
    return () => { alive = false; };
  }, [nonce]);
  return { state, retry: () => setNonce((n) => n + 1) };
}

export default function Home() {
  const { language, direction } = useLanguage() as ReturnType<typeof useLanguage> & { direction?: "rtl" | "ltr" };
  const dir = direction || (language === "ar" ? "rtl" : "ltr");
  const { data: settings } = useSiteContentSettings();
  const home = settings.experience.home;
  const legacy = settings.pages.home;
  const { state, retry } = usePrograms();
  const L = (b: { ar: string; en: string }) => b[language] || "";
  const Arrow = language === "ar" ? ArrowLeft : ArrowRight;
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  useEffect(() => setHeroImageFailed(false), [home.hero.imageUrl]);
  const showHeroImage = Boolean(home.hero.imageUrl) && !heroImageFailed;
  const legacyTitle = language === "ar" ? legacy.titleAr : legacy.titleEn;
  const legacyDesc = language === "ar" ? legacy.descriptionAr : legacy.descriptionEn;
  const legacyContent = (language === "ar" ? legacy.contentAr : legacy.contentEn)?.trim();
  const affiliations = home.affiliations;
  const universities = (affiliations.universities || []).map(L).filter(Boolean);
  const countries = (affiliations.countries || []).map(L).filter(Boolean);
  const journalOptions = settings.journalOptions || [];
  const journals = journalOptions.map((journal) => language === "ar" ? journal.nameAr || journal.nameEn : journal.nameEn || journal.nameAr).filter(Boolean);
  const services = settings.experience.content.services.items;
  const marqueeStyle = (seconds: number): CSSProperties => ({ "--m-home-marquee-duration": `${seconds}s` } as CSSProperties);

  const sections: Record<HomeSectionId, () => ReactNode> = {
    hero: () => (
      <section key="hero" className="m-home-hero-v2" data-testid="section-hero">
        <div className="m-home-hero-grid m-container">
          <div className="m-home-copy">
            <p className="m-home-kicker m-rise" data-testid="text-hero-eyebrow"><span className="m-home-kicker-mark" aria-hidden="true" />{legacyTitle && legacyTitle !== (language === "ar" ? settings.brand.siteNameAr : settings.brand.siteNameEn) ? legacyTitle : L(home.hero.eyebrow)}</p>
            <h1 className="m-home-title m-rise m-rise-2" data-testid="text-hero-title">{L(home.hero.title)} <span className="m-home-title-accent">{L(home.hero.highlight)}</span></h1>
            {legacyDesc && <p className="m-home-legacy-description m-rise m-rise-3" data-testid="text-hero-legacy-description">{legacyDesc}</p>}
            <p className="m-home-subtitle m-rise m-rise-3" data-testid="text-hero-subtitle">{L(home.hero.subtitle)}</p>
            <div className="m-home-actions m-rise m-rise-4">
              <Link href={LINKABLE_ROUTES[home.hero.primaryCta.route]} className="m-btn m-btn-primary m-home-primary-cta" data-testid="link-hero-primary">{L(home.hero.primaryCta.label)}<Arrow size={17} /></Link>
              <Link href={LINKABLE_ROUTES[home.hero.secondaryCta.route]} className="m-btn m-btn-ghost m-home-secondary-cta" data-testid="link-hero-secondary">{L(home.hero.secondaryCta.label)}</Link>
            </div>
            <div className="m-home-trust-note m-rise m-rise-4">
              <span className="m-home-trust-mark"><Check size={15} /></span>
              <span>{language === "ar" ? "وضوح التفاصيل قبل اتخاذ القرار" : "Clear details before you decide"}</span>
            </div>
          </div>
          <div className="m-home-image-stage m-rise m-rise-2">
            <div className="m-home-image-frame">
              {showHeroImage ? <img src={home.hero.imageUrl} alt={L(home.hero.imageAlt)} className="m-home-hero-image" data-testid="img-hero" onError={() => setHeroImageFailed(true)} /> : (
                <div className="m-home-image-fallback" aria-hidden="true">
                  <div className="m-home-fallback-orbit m-home-fallback-orbit-a" />
                  <div className="m-home-fallback-orbit m-home-fallback-orbit-b" />
                  <div className="m-home-fallback-center"><Microscope size={42} strokeWidth={1.2} /><span>{language === "ar" ? settings.brand.siteNameAr : settings.brand.siteNameEn}</span></div>
                </div>
              )}
              <div className="m-home-image-caption">
                <span className="m-home-caption-index">M / 01</span>
                <span>{language === "ar" ? "بحث أوضح. قرار أهدأ." : "Clearer research. Better-informed decisions."}</span>
              </div>
            </div>
            <div className="m-home-image-stamp"><FlaskConical size={20} /><span>{language === "ar" ? "منهجية علمية" : "Scientific method"}</span></div>
            {state.status === "ready" && state.items.length > 0 && (
              <div className="m-home-open-badge" data-testid="badge-open-count">
                <span className="m-home-open-number">{state.items.length}</span>
                <span>{language === "ar" ? "فرصة مفتوحة الآن" : "open opportunities"}</span>
              </div>
            )}
          </div>
        </div>
        <div className="m-container m-home-facts m-rise m-rise-4" aria-label={language === "ar" ? "لمحة عن مسبار" : "Misbar at a glance"}>
          <div className="m-home-fact"><span className="m-home-fact-medal"><Award size={17} /></span><strong>{state.status === "ready" ? state.items.length : "—"}</strong><span>{language === "ar" ? "فرص مفتوحة" : "open opportunities"}</span></div>
          <div className="m-home-fact"><span className="m-home-fact-medal"><BookOpenText size={17} /></span><strong>{journals.length}</strong><span>{language === "ar" ? "خيارات للمجلات" : "journal options"}</span></div>
          <div className="m-home-fact"><span className="m-home-fact-medal"><Users size={17} /></span><strong>{countries.length}</strong><span>{language === "ar" ? "دول في القائمة" : "countries listed"}</span></div>
        </div>
        {legacyContent && <div className="m-container pb-8"><div className="m-card m-home-legacy-content" data-testid="text-home-legacy-content">{legacyContent}</div></div>}
        <div className="m-home-scroll-cue" aria-hidden="true"><span>{language === "ar" ? "اكتشف مسبار" : "Discover Misbar"}</span><ChevronDown size={15} /></div>
      </section>
    ),
    services: () => (
      <section key="services" className="m-home-services m-section" data-testid="section-services">
        <div className="m-container">
          <div className="m-home-section-heading m-home-heading-split">
            <div><span className="m-eyebrow">{language === "ar" ? "ما تحتاجه في مكان واحد" : "Research, made navigable"}</span><h2 className="m-h2 mt-3">{L(home.services.title)}</h2></div>
            <p className="m-muted max-w-md leading-7">{L(home.services.subtitle)}</p>
          </div>
          <div className="m-home-services-grid">
            {(services || []).map((item, i) => {
              const ServiceIcon = [Microscope, FlaskConical, BookOpenText, ClipboardCheck][i % 4];
              return <article className={`m-home-service-card m-home-service-${i % 4}`} key={`${L(item.title)}-${i}`} data-testid={`card-service-${i}`}>
                <span className="m-home-service-number">{String(i + 1).padStart(2, "0")}</span>
                <div className="m-home-service-icon"><ServiceIcon size={21} strokeWidth={1.7} /></div>
                <h3>{L(item.title)}</h3><p>{L(item.body)}</p>
                <Link href="/special-requests" className="m-home-service-link" data-testid={`link-service-${i}`}>{language === "ar" ? "استكشف الخدمة" : "Explore service"}<Arrow size={15} /></Link>
              </article>;
            })}
          </div>
        </div>
      </section>
    ),
    programs: () => (
      <section key="programs" className="m-home-programs m-section" data-testid="section-programs">
        <div className="m-container">
          <div className="m-home-section-heading m-home-heading-split">
            <div><span className="m-eyebrow">{language === "ar" ? "الفرص البحثية" : "Research opportunities"}</span><h2 className="m-h2 mt-3">{L(home.programs.title)}</h2><p className="m-muted mt-2">{L(home.programs.subtitle)}</p></div>
            <Link href="/participant-portal" className="m-btn m-btn-ghost m-btn-sm" data-testid="link-programs-all">{L(home.programs.viewAllLabel)}<Arrow size={15} /></Link>
          </div>
          <div className="mt-10">
            {state.status === "loading" && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="m-skeleton h-56" />)}</div>}
            {state.status === "error" && <div className="m-card m-home-program-state" data-testid="state-programs-error"><p className="font-semibold">{language === "ar" ? "تعذر تحميل الفرص الآن." : "Could not load opportunities right now."}</p><button type="button" onClick={retry} className="m-btn m-btn-primary m-btn-sm" data-testid="button-programs-retry"><RefreshCw size={15} />{language === "ar" ? "إعادة المحاولة" : "Try again"}</button></div>}
            {state.status === "ready" && state.items.length === 0 && <div className="m-card m-home-program-state" data-testid="state-programs-empty"><div className="m-home-state-icon"><CalendarClock size={24} /></div><p>{L(home.programs.emptyText)}</p><Link href="/knowledge-center" className="m-btn m-btn-ghost m-btn-sm">{L(home.knowledge.ctaLabel)}</Link></div>}
            {state.status === "ready" && state.items.length > 0 && home.programs.limit > 0 && <div className="m-home-program-grid">
              {state.items.slice(0, home.programs.limit).map((p, i) => {
                const title = (language === "ar" ? p.titleAr : p.titleEn) || p.title;
                const specialty = (language === "ar" ? p.specialtyAr : p.specialtyEn) || p.specialty;
                return <Link key={p.id} href={`/research/${p.id}`} className="m-card m-home-program-card" style={{ animationDelay: `${i * 60}ms` }} data-testid={`card-program-${p.id}`}>
                  <div className="m-home-program-card-top"><span className="m-home-program-index">{String(i + 1).padStart(2, "0")}</span><span className="m-home-specialty">{specialty}</span></div>
                  <h3>{title}</h3>
                  <div className="m-home-program-meta"><span><Users size={15} />{p.seatsLeft}/{p.totalSeats}</span>{p.duration && <span><CalendarClock size={15} />{p.duration}</span>}<Arrow size={16} className="m-home-program-arrow" /></div>
                </Link>;
              })}
            </div>}
          </div>
        </div>
      </section>
    ),
    affiliations: () => {
      if (!universities.length && !countries.length) return null;
      return <section id="affiliations" key="affiliations" className="m-home-affiliations m-section" data-testid="section-affiliations">
        <div className="m-container">
          <div className="m-home-affiliation-head"><span className="m-eyebrow">{language === "ar" ? "امتداد معرفي" : "A wider research community"}</span><h2 className="m-h2 mt-3">{L(affiliations.title)}</h2><p className="m-muted mt-3">{L(affiliations.subtitle)}</p></div>
          {countries.length > 0 && <div className="m-home-affiliation-group">
            <h3 className="m-home-affiliation-label">{L(affiliations.countriesTitle)}</h3>
            <div className="m-home-country-window" aria-label={L(affiliations.countriesTitle)}>
              <div className="m-home-country-track" data-animated={affiliations.animationEnabled && settings.experience.theme.motion} style={marqueeStyle(affiliations.animationDurationSeconds)}>
                {[...countries, ...countries].map((name, i) => <span className="m-home-country-chip" key={`${name}-${i}`} dir={language === "ar" ? "rtl" : "ltr"} aria-hidden={i >= countries.length}>{name}</span>)}
              </div>
            </div>
          </div>}
          {universities.length > 0 && <div className="m-home-affiliation-group">
            <h3 className="m-home-affiliation-label">{L(affiliations.universitiesTitle)}</h3>
            <div className="m-home-university-window" aria-label={L(affiliations.universitiesTitle)}>
              <div className="m-home-university-track" data-animated={affiliations.animationEnabled && settings.experience.theme.motion} style={marqueeStyle(affiliations.animationDurationSeconds)}>
                {[...universities, ...universities].map((name, i) => <span className="m-home-university-chip" key={`${name}-${i}`} dir={language === "ar" ? "rtl" : "ltr"} aria-hidden={i >= universities.length}><span className="m-home-university-seal" aria-hidden="true"><BookOpenText size={15} /></span>{name}</span>)}
              </div>
            </div>
          </div>}
        </div>
      </section>;
    },
    journalTicker: () => {
      if (!journalOptions.length) return null;
      return <section id="journal-ticker" key="journalTicker" className="m-home-journals" data-testid="section-journal-ticker">
        <div className="m-container m-home-journal-heading">
          <div>
            <span className="m-eyebrow">{language === "ar" ? "دليل المجلات" : "Journal directory"}</span>
            <h2>{L(home.journalTicker.title)}</h2>
            <p>{L(home.journalTicker.subtitle)}</p>
          </div>
          <span className="m-home-journal-seal" aria-hidden="true"><BookOpenText size={22} /></span>
        </div>
        <div className="m-home-journal-window" aria-label={language === "ar" ? "خيارات المجلات وبيانات الفهرسة المسجلة" : "Journal options and recorded indexing details"}>
          <div className="m-home-journal-track" data-animated={home.journalTicker.animationEnabled && settings.experience.theme.motion} style={marqueeStyle(home.journalTicker.animationDurationSeconds)}>
            {[...journalOptions, ...journalOptions].map((journal, i) => {
              const name = language === "ar" ? journal.nameAr || journal.nameEn : journal.nameEn || journal.nameAr;
              const specialtyParts = (journal.specialty || "").split(" / ");
              const specialty = language === "ar" ? specialtyParts[specialtyParts.length - 1] : specialtyParts[0];
              const indexes = [
                { name: "PubMed", value: journal.pubmed },
                { name: "Scopus", value: journal.scopus },
                { name: "WoS", value: journal.wos },
              ].filter(({ value }) => Boolean(value?.trim()) && !/^(no|false|none|n\/a)$/i.test(value.trim()));
              return <article
                key={`${journal.id || name}-${i}`}
                className={`m-home-journal-card m-home-journal-card-${i % 4}`}
                dir={language === "ar" ? "rtl" : "ltr"}
                aria-hidden={i >= journalOptions.length}
                data-testid={i < journalOptions.length ? `card-journal-${journal.id}` : undefined}
              >
                <div className="m-home-journal-cover" aria-hidden="true">
                  <span className="m-home-journal-cover-number">MISBAR / {String((i % journalOptions.length) + 1).padStart(2, "0")}</span>
                  <BookOpenText size={25} strokeWidth={1.5} />
                  <span className="m-home-journal-cover-name" dir="ltr">{journal.nameEn || name}</span>
                </div>
                <div className="m-home-journal-card-copy">
                  {specialty && <span className="m-home-journal-specialty">{specialty}</span>}
                  <h3>{name}</h3>
                  {journal.issn && <span className="m-home-journal-issn" dir="ltr">ISSN {journal.issn}</span>}
                  {indexes.length > 0 && <div className="m-home-journal-indexes" aria-label={language === "ar" ? "بيانات الفهرسة" : "Indexing details"}>
                    {indexes.map(({ name: indexName, value }) => <span key={indexName}><strong>{indexName}</strong><small>{value.trim().toLowerCase() === "indexed" && language === "ar" ? "مفهرس" : value}</small></span>)}
                  </div>}
                </div>
              </article>;
            })}
          </div>
        </div>
        <p className="m-container m-home-journal-disclaimer">{language === "ar" ? "تُعرض بيانات الفهرسة وفق السجلات المحفوظة في لوحة الإدارة؛ تحقّق من المصدر الرسمي قبل اختيار المجلة." : "Indexing details reflect the records saved in the admin panel; verify them with the official source before choosing a journal."}</p>
      </section>;
    },
    pathways: () => (
      <section key="pathways" className="m-home-pathways m-section" data-testid="section-pathways">
        <div className="m-container">
          <div className="m-home-pathway-intro"><span className="m-eyebrow">{language === "ar" ? "مسارات مهنية متنوعة" : "Different professional paths"}</span><h2 className="m-h2 mt-3">{L(home.pathways.title)}</h2><p>{L(home.pathways.subtitle)}</p></div>
          <div className="m-home-pathway-grid">{home.pathways.items.map((item, i) => <article key={i} className="m-home-pathway-card" data-testid={`card-pathway-${i}`}><span className="m-home-pathway-index">{String(i + 1).padStart(2, "0")}</span><h3>{L(item.title)}</h3><p>{L(item.body)}</p></article>)}</div>
        </div>
      </section>
    ),
    process: () => (
      <section key="process" className="m-home-process m-section" data-testid="section-process">
        <div className="m-container"><div className="m-home-process-head"><span className="m-eyebrow">{language === "ar" ? "خطواتك القادمة" : "A clear next step"}</span><h2 className="m-h2 mt-3">{L(home.process.title)}</h2></div>
          <ol className="m-home-process-list">{home.process.steps.map((step, i) => <li key={i} data-testid={`step-process-${i}`}><span className="m-home-process-count">{String(i + 1).padStart(2, "0")}</span><div><h3>{L(step.title)}</h3><p>{L(step.body)}</p></div></li>)}</ol>
        </div>
      </section>
    ),
    knowledge: () => (
      <section key="knowledge" className="m-container m-home-resource-wrap" data-testid="section-knowledge">
        <div className="m-home-resource-panel"><div className="m-home-resource-icon"><BookOpenText size={26} /></div><div><span className="m-eyebrow">{language === "ar" ? "مركز المعرفة" : "Knowledge center"}</span><h2>{L(home.knowledge.title)}</h2><p>{L(home.knowledge.body)}</p></div><Link href="/knowledge-center" className="m-btn m-btn-primary" data-testid="link-home-knowledge">{L(home.knowledge.ctaLabel)}<Arrow size={16} /></Link></div>
      </section>
    ),
    faqTeaser: () => (
      <section key="faqTeaser" className="m-container m-home-resource-wrap" data-testid="section-faq-teaser">
        <div className="m-home-faq-panel"><div className="m-home-faq-icon"><HelpCircle size={25} /></div><div><span className="m-eyebrow">{language === "ar" ? "بلا إجابات مبهمة" : "Straight answers"}</span><h2>{L(home.faqTeaser.title)}</h2><p>{L(home.faqTeaser.body)}</p></div><Link href="/faq" className="m-btn m-btn-ghost" data-testid="link-home-faq">{L(home.faqTeaser.ctaLabel)}<Arrow size={16} /></Link></div>
      </section>
    ),
    cta: () => (
      <section key="cta" className="m-home-final m-section" data-testid="section-cta"><div className="m-container"><div className="m-home-final-panel"><span className="m-home-final-symbol" aria-hidden="true">{language === "ar" ? "م" : "M"}</span><span className="m-eyebrow">{language === "ar" ? "ابدأ من السؤال الصحيح" : "Start with the right question"}</span><h2>{L(home.cta.title)}</h2><p>{L(home.cta.body)}</p><Link href={LINKABLE_ROUTES[home.cta.route]} className="m-btn m-btn-gold" data-testid="link-home-cta">{L(home.cta.label)}<Arrow size={17} /></Link></div></div></section>
    ),
  };

  return <div dir={dir} className="m-home-page">{home.sections.filter((s) => s.visible).map((s) => sections[s.id]())}</div>;
}
