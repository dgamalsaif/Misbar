import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Check, ChevronDown, Languages, Menu, MessageCircle, X } from "lucide-react";
import InstallAppButton from "@/components/InstallAppButton";
import { useLanguage } from "@/lib/i18n";
import { useCurrency, OpportunityCurrency } from "@/lib/currency";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import { getContactUsHref } from "@/lib/siteContentSettings";
import { LINKABLE_ROUTES } from "../../../../lib/site-experience";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { data: settings } = useSiteContentSettings();
  const nav = settings.experience.navigation;
  const contact = getContactUsHref(settings.brand);
  const contactLabel = language === "ar" ? contact.labelAr : contact.labelEn;
  const siteName = language === "ar" ? settings.brand.siteNameAr : settings.brand.siteNameEn;
  const languageLabel = language === "ar" ? "English" : "العربية";
  const languageOptions = [
    { value: "ar" as const, label: "العربية" },
    { value: "en" as const, label: "English" },
  ];
  const links = nav.items.filter((i) => i.visible).map((i) => ({ href: LINKABLE_ROUTES[i.route], label: i.label[language] || i.label.ar, highlight: i.highlight, route: i.route }));
  const isActive = (href: string) => (href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5" data-testid="site-navbar">
      <nav className="m-pill-nav mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-3 shadow-[0_10px_30px_-24px_rgba(20,35,31,.5)] sm:px-4">
        <Link href="/" data-testid="link-logo" className="flex min-w-0 items-center gap-2.5">
          {settings.brand.logoUrl && <img src={settings.brand.logoUrl} alt={siteName || ""} className="h-10 w-10 shrink-0 rounded-[30%] object-cover" />}
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="m-display truncate text-lg font-bold text-[color:var(--m-primary)]">{siteName || "Misbar"}</span>
            {nav.showTagline && nav.tagline[language] && <span className="hidden truncate text-[11px] text-[color:var(--m-muted)] sm:block">{nav.tagline[language]}</span>}
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link key={link.route} href={link.href} data-active={isActive(link.href)} data-highlight={link.highlight} data-testid={`link-nav-${link.route}`} className="m-nav-link">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {nav.showCurrency && <CurrencyToggle currency={currency} onSelect={setCurrency} triggerClassName="hidden sm:inline-flex" />}
          <Link
            href="/notifications"
            data-testid="link-notifications"
            aria-label={language === "ar" ? "إشعارات المشاركين" : "Participant notifications"}
            title={language === "ar" ? "إشعارات المشاركين" : "Participant notifications"}
            className="m-btn m-btn-ghost m-btn-sm !hidden sm:!inline-flex"
          >
            <Bell size={15} />
            <span className="hidden xl:inline">{language === "ar" ? "الإشعارات" : "Updates"}</span>
          </Link>
          {nav.showLanguage && (
            <button type="button" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} data-testid="button-language-toggle" className="m-btn m-btn-ghost m-btn-sm !hidden sm:!inline-flex">
              <Languages size={14} />{languageLabel}
            </button>
          )}
          {nav.showContactButton && (
            <a href={contact.href} target={contact.isExternal ? "_blank" : undefined} rel={contact.isExternal ? "noopener noreferrer" : undefined} data-testid="link-nav-contact" className="m-btn m-btn-primary m-btn-sm !hidden md:!inline-flex">
              <MessageCircle size={14} />{contactLabel}
            </a>
          )}
          <button data-testid="button-mobile-menu" className="rounded-full p-2 text-[color:var(--m-primary)] hover:bg-[color:var(--m-primary-soft)] lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={language === "ar" ? "القائمة" : "Menu"}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="m-card m-rise mx-auto mt-2 max-w-[1240px] p-3 lg:hidden">
          <div className="grid gap-1">
            {links.map((link) => (
              <Link key={link.route} href={link.href} data-active={isActive(link.href)} data-testid={`link-mobile-${link.route}`} className="m-nav-link !py-3 text-base" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/notifications" data-testid="link-mobile-notifications" className="m-nav-link !py-3 text-base" onClick={() => setMobileOpen(false)}>
              <Bell size={16} className="me-2 inline-block" />
              {language === "ar" ? "إشعارات المشاركين" : "Participant notifications"}
            </Link>
          </div>
          <div className="mt-3 grid gap-2 border-t border-[color:var(--m-line)] pt-3">
            {nav.showContactButton && (
              <a href={contact.href} target={contact.isExternal ? "_blank" : undefined} rel={contact.isExternal ? "noopener noreferrer" : undefined} data-testid="link-nav-contact-mobile" className="m-btn m-btn-primary w-full">
                <MessageCircle size={16} />{contactLabel}
              </a>
            )}
            {nav.showCurrency && <CurrencyToggle currency={currency} onSelect={(next) => { setCurrency(next); setMobileOpen(false); }} triggerClassName="flex w-full" mobile />}
            {nav.showLanguage && (
              <LanguageMenu language={language} label={language === "ar" ? "اللغة" : "Language"} options={languageOptions} onSelect={(next) => { setLanguage(next); setMobileOpen(false); }} triggerClassName="flex w-full" mobile />
            )}
          </div>
        </div>
      )}
      <InstallAppButton enabled={nav.showInstall} />
    </header>
  );
}

export function LanguageMenu({
  language,
  label,
  options,
  onSelect,
  triggerClassName,
  mobile = false,
}: {
  language: "ar" | "en";
  label: string;
  options: { value: "ar" | "en"; label: string }[];
  onSelect: (language: "ar" | "en") => void;
  triggerClassName: string;
  mobile?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${triggerClassName} relative`}>
      <button
        type="button"
        data-testid={mobile ? "button-language-menu-mobile" : "button-language-menu"}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`${mobile ? "w-full" : ""} inline-flex items-center justify-center gap-1.5 m-btn m-btn-ghost m-btn-sm`}
        aria-label={label}
      >
        <Languages size={15} />
        {label}
        <ChevronDown size={14} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {isOpen && (
        <div role="menu" className={`absolute z-[60] mt-2 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${mobile ? "left-0 right-0" : "right-0"}`}>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            data-testid={`button-language-${option.value}`}
            onClick={() => { onSelect(option.value); setIsOpen(false); }}
            role="menuitemradio"
            aria-checked={language === option.value}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm font-bold text-slate-700 transition hover:bg-[#e6f5ef] hover:text-[#117b59] focus:bg-[#e6f5ef] focus:text-[#117b59]"
          >
            {option.label}
            {language === option.value && <Check size={15} className="text-[#117b59]" />}
          </button>
        ))}
        </div>
      )}
    </div>
  );
}

export function CurrencyToggle({
  currency,
  onSelect,
  triggerClassName,
  mobile = false,
}: {
  currency: OpportunityCurrency;
  onSelect: (currency: OpportunityCurrency) => void;
  triggerClassName: string;
  mobile?: boolean;
}) {
  return (
    <div className={`${triggerClassName} items-center`} dir="ltr">
      <div
        className={`${
          mobile ? "w-full justify-center" : ""
        } inline-flex items-center rounded-full border border-[color:var(--m-line)] bg-[color:var(--m-primary-soft)] p-0.5 shadow-2xs`}
      >
        <button
          type="button"
          data-testid={mobile ? "button-currency-sar-mobile" : "button-currency-sar-nav"}
          onClick={() => onSelect("SAR")}
          className={`${
            mobile ? "flex-1 py-2 text-xs" : "px-3 py-1.5 text-xs"
          } rounded-full font-black transition-all ${
            currency === "SAR"
              ? "bg-[#0C3156] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="Saudi Riyal (SAR)"
        >
           SAR
        </button>
        <button
          type="button"
          data-testid={mobile ? "button-currency-usd-mobile" : "button-currency-usd-nav"}
          onClick={() => onSelect("USD")}
          className={`${
            mobile ? "flex-1 py-2 text-xs" : "px-3 py-1.5 text-xs"
          } rounded-full font-black transition-all ${
            currency === "USD"
              ? "bg-[#0C3156] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
          title="US Dollar (USD)"
        >
           USD
        </button>
      </div>
    </div>
  );
}

