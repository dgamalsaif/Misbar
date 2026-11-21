import { Link } from "wouter";
import { Phone, Mail, MessageCircle, Send, Radio, Instagram, Linkedin, AtSign } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import { getContactUsHref } from "@/lib/siteContentSettings";
import { LINKABLE_ROUTES } from "../../../../lib/site-experience";

function socialUrl(value: string | undefined, baseUrl: string) {
  if (!value) return "";
  return value.startsWith("https://") ? value : `${baseUrl}${value.replace(/^@/, "")}`;
}

function telegramHref(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("http")) return v;
  const clean = v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "").replace(/\/$/, "");
  const isPhone = /^\+?\d{8,15}$/.test(clean.replace(/\s+/g, "")) || (/^05\d{8}$/.test(clean) && clean.length === 10);
  if (isPhone) {
    let digits = clean.replace(/[^\d]/g, "");
    if (digits.startsWith("05") && digits.length === 10) digits = "966" + digits.substring(1);
    return `tg://resolve?phone=${digits}`;
  }
  return `https://t.me/${clean}`;
}

export default function Footer() {
  const { language } = useLanguage();
  const { data: settings } = useSiteContentSettings();
  const brand = settings.brand;
  const footer = settings.experience.footer;
  const siteName = language === "ar" ? brand.siteNameAr : brand.siteNameEn;
  const contact = getContactUsHref(brand);
  const tg = telegramHref(brand.telegramUsername || "");
  const instagramUrl = socialUrl(brand.instagramUsername, "https://instagram.com/");
  const xUrl = socialUrl(brand.xUsername, "https://x.com/");
  const linkedinUrl = socialUrl(brand.linkedinUsername, "https://www.linkedin.com/in/");
  const linkCls = "inline-flex items-center gap-2 text-sm text-[color:var(--m-surface)]/75 transition-colors hover:text-[color:var(--m-gold)]";

  return (
    <footer className="relative mt-16 overflow-hidden bg-[color:var(--m-primary)] text-[color:var(--m-surface)]" data-testid="site-footer">
      <div className="m-rule absolute inset-x-0 top-0" />
      <div className="m-container grid gap-12 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            {brand.logoUrl && <img src={brand.logoUrl} alt="" className="h-12 w-12 rounded-[30%] object-cover ring-1 ring-white/15" />}
            <span className="m-display text-2xl font-bold">{siteName}</span>
          </div>
          {footer.tagline[language] && <p className="mt-5 max-w-md text-sm leading-7 text-[color:var(--m-surface)]/75" data-testid="text-footer-tagline">{footer.tagline[language]}</p>}
        </div>

        {footer.showLinks && footer.links.some((l) => l.visible) && (
          <div className="md:col-span-3">
            <h3 className="mb-4 text-sm font-semibold text-[color:var(--m-gold)]">{footer.linksTitle[language]}</h3>
            <ul className="grid gap-2.5">
              {footer.links.filter((l) => l.visible).map((l) => (
                <li key={l.route}>
                  <Link href={LINKABLE_ROUTES[l.route]} className={linkCls} data-testid={`link-footer-${l.route}`}>{l.label[language] || l.label.ar}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {footer.showContact && (
          <div className="md:col-span-4">
            <h3 className="mb-4 text-sm font-semibold text-[color:var(--m-gold)]">{language === "ar" ? contact.labelAr : contact.labelEn}</h3>
            <div className="grid gap-2.5">
              <a href={contact.href} target={contact.isExternal ? "_blank" : undefined} rel={contact.isExternal ? "noopener noreferrer" : undefined} className={linkCls} data-testid="link-footer-contact-us">
                <MessageCircle size={15} />{language === "ar" ? contact.labelAr : contact.labelEn}
              </a>
              {brand.phone && <a href={`tel:${brand.phone}`} className={linkCls} data-testid="link-footer-phone" dir="ltr"><Phone size={15} />{brand.phone}</a>}
              {brand.whatsapp && <a href={`https://wa.me/${brand.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className={linkCls} data-testid="link-footer-whatsapp" dir="ltr"><MessageCircle size={15} />+{brand.whatsapp.replace(/^\+/, "")}</a>}
              {tg && <a href={tg} target="_blank" rel="noopener noreferrer" className={linkCls} data-testid="link-footer-telegram"><Send size={15} />Telegram</a>}
              {brand.whatsappChannelUrl && <a href={brand.whatsappChannelUrl} target="_blank" rel="noopener noreferrer" className={linkCls} data-testid="link-footer-channel"><Radio size={15} />{language === "ar" ? "قناة واتساب" : "WhatsApp channel"}</a>}
              {brand.email && <a href={`mailto:${brand.email}`} className={linkCls} data-testid="link-footer-email"><Mail size={15} />{brand.email}</a>}
              <div className="mt-1 flex gap-3">
                {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={linkCls} aria-label="Instagram"><Instagram size={17} /></a>}
                {xUrl && <a href={xUrl} target="_blank" rel="noopener noreferrer" className={linkCls} aria-label="X"><AtSign size={17} /></a>}
                {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkCls} aria-label="LinkedIn"><Linkedin size={17} /></a>}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="m-container flex flex-col gap-2 py-6 text-xs text-[color:var(--m-surface)]/60 md:flex-row md:items-center md:justify-between">
          <span>{new Date().getFullYear()} {footer.copyright[language]}</span>
          {footer.disclaimer[language] && <span className="max-w-2xl leading-6" data-testid="text-footer-disclaimer">{footer.disclaimer[language]}</span>}
        </div>
      </div>
    </footer>
  );
}
