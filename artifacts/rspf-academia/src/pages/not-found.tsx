import { Link } from "wouter";
import { Compass } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";

export default function NotFound() {
  const { language } = useLanguage();
  const { data } = useSiteContentSettings();
  const c = data.experience.content.notFound;
  return (
    <div className="m-container flex min-h-[60dvh] items-center justify-center py-16" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="m-card m-rise max-w-lg p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--m-gold-soft)] text-[color:var(--m-primary)]"><Compass size={28} /></div>
        <p className="m-numeral text-5xl">404</p>
        <h1 className="m-h2 mt-3" data-testid="text-notfound-title">{c.title[language]}</h1>
        <p className="m-muted mt-3 leading-7">{c.body[language]}</p>
        <Link href="/" className="m-btn m-btn-primary mt-8" data-testid="link-notfound-home">{c.ctaLabel[language]}</Link>
      </div>
    </div>
  );
}
