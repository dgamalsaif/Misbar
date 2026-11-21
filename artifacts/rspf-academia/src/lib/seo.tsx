import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PRIVATE_ROUTE_IDS, fillSeoTemplate, resolveRouteId } from "../../../../lib/site-experience";
import type { SiteLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";

const SITE_URL = "https://srmaacademy.com";

function setMeta(selector: string, attribute: "name" | "property", value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, selector.match(/="([^"]+)"/)?.[1] || "");
    document.head.appendChild(element);
  }
  element.content = value;
}

function setLink(rel: string, href: string, language?: string) {
  const selector = language ? `link[rel="${rel}"][hreflang="${language}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    if (language) element.hreflang = language;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function buildPublicUrl(pathname: string, language: SiteLanguage) {
  const url = new URL(pathname, SITE_URL);
  url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  url.searchParams.set("lang", language);
  return url.toString();
}

interface SeoOverride {
  pathname: string;
  title?: string;
  description?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SeoCtx = createContext<{ override: SeoOverride | null; setOverride: (o: SeoOverride | null) => void }>({ override: null, setOverride: () => undefined });

export function SeoProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<SeoOverride | null>(null);
  return <SeoCtx.Provider value={{ override, setOverride }}>{children}</SeoCtx.Provider>;
}

/**
 * Page-level SEO registration. Pages pass raw values (e.g. the article/opportunity title);
 * they are injected into the owner-editable template for that route ({title}, {description}).
 * This component never writes to <head> itself, which removes the title race with the root manager.
 */
export function PageSeo({ pathname, title, description, image, jsonLd }: {
  pathname: string;
  language?: SiteLanguage;
  title?: string;
  description?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noIndex?: boolean;
}) {
  const { setOverride } = useContext(SeoCtx);
  const jsonKey = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    setOverride({ pathname, title, description, image, jsonLd: jsonKey ? JSON.parse(jsonKey) : undefined });
    return () => setOverride(null);
  }, [pathname, title, description, image, jsonKey, setOverride]);
  return null;
}

/** The single writer of document.title and SEO meta. Rendered once in App. */
export function SeoManager({ pathname, language }: { pathname: string; language: SiteLanguage }) {
  const { data: settings } = useSiteContentSettings();
  const { override } = useContext(SeoCtx);
  useEffect(() => {
    const routeId = resolveRouteId(pathname);
    const entry = settings.experience.seo[routeId];
    const activeOverride = override && override.pathname.replace(/\/$/, "") === (pathname.replace(/\/$/, "") || "/") ? override : null;
    const siteName = language === "ar" ? settings.brand.siteNameAr || "مسبار" : settings.brand.siteNameEn || "Misbar";
    const vars = { title: activeOverride?.title || siteName, description: activeOverride?.description || "", site: siteName };
    const pageTitle = fillSeoTemplate(entry.title[language] || siteName, vars) || siteName;
    const pageDescription = fillSeoTemplate(entry.description[language], vars) || activeOverride?.description || settings.experience.seo.home.description[language];
    const noIndex = entry.noIndex || PRIVATE_ROUTE_IDS.includes(routeId) || routeId === "notFound";
    const canonical = buildPublicUrl(pathname, language);
    const abs = (u: string) => new URL(u, SITE_URL).toString();
    const logo = settings.brand.logoUrl ? abs(settings.brand.logoUrl) : "";
    const imageSrc = activeOverride?.image || entry.imageUrl || settings.experience.seo.home.imageUrl;
    const configuredShareImage = settings.brand.socialShareImageUrl;
    const socialImage = configuredShareImage
      ? abs(configuredShareImage)
      : imageSrc && !imageSrc.startsWith("data:")
        ? abs(imageSrc)
        : `${SITE_URL}/api/site-share-image?v=${encodeURIComponent(settings.brand.socialShareImageVersion || "current")}`;

    document.title = pageTitle;
    document.documentElement.lang = language;
    setMeta('meta[name="description"]', "name", pageDescription);
    setMeta('meta[name="robots"]', "name", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta('meta[property="og:title"]', "property", pageTitle);
    setMeta('meta[property="og:site_name"]', "property", siteName);
    setMeta('meta[property="og:description"]', "property", pageDescription);
    setMeta('meta[property="og:url"]', "property", canonical);
    if (socialImage) {
      setMeta('meta[property="og:image"]', "property", socialImage);
      setMeta('meta[property="og:image:secure_url"]', "property", socialImage);
      setMeta('meta[property="og:image:alt"]', "property", siteName);
      setMeta('meta[name="twitter:image"]', "name", socialImage);
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[property="og:image:secure_url"]')?.remove();
      document.head.querySelector('meta[property="og:image:alt"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    }
    setMeta('meta[property="og:locale"]', "property", language === "ar" ? "ar_SA" : "en_US");
    setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", pageTitle);
    setMeta('meta[name="twitter:description"]', "name", pageDescription);
    setLink("canonical", canonical);
    setLink("alternate", buildPublicUrl(pathname, "ar"), "ar");
    setLink("alternate", buildPublicUrl(pathname, "en"), "en");
    setLink("alternate", buildPublicUrl(pathname, "ar"), "x-default");

    const structuredData = activeOverride?.jsonLd || {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: siteName,
          url: SITE_URL,
          ...(logo ? { logo } : {}),
          description: settings.experience.seo.home.description[language] || pageDescription,
        },
        {
          "@type": "WebSite",
          name: siteName,
          url: SITE_URL,
          inLanguage: language,
        },
        {
          "@type": "WebPage",
          name: pageTitle,
          description: pageDescription,
          url: canonical,
          inLanguage: language,
        },
      ],
    };
    let script = document.head.querySelector<HTMLScriptElement>('script[data-srma-jsonld="page"]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.srmaJsonld = "page";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(structuredData);
  }, [language, pathname, settings, override]);

  return null;
}

export const SEO_KEYWORD_FAMILIES = {
  ar: [
    "البورد السعودي", "أبحاث البورد السعودي", "التقديم على البورد للأطباء", "الزمالة السعودية", "الزمالات الطبية",
    "ترقية أكاديمية للأطباء", "الترقي الأكاديمي", "Matching 2026", "البورد الأردني", "البورد الأمريكي", "البورد البريطاني",
    "الزمالات الأمريكية", "الزمالة الكندية", "نشر علمي للأبحاث", "اختيار المجلات",
    "مجلات Q1 وQ2", "PubMed", "Scopus", "Web of Science", "SMLE", "SPLE", "SDLE", "USMLE", "MRCOG",
  ],
  en: [
    "medical research publication", "board application research", "fellowship research", "journal selection",
    "Q1 Q2 medical journals", "PubMed", "Scopus", "Web of Science", "USMLE research", "MRCOG research",
  ],
};