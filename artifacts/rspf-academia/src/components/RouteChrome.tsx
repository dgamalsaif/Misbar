import { Link, useLocation } from "wouter";
import { Eye, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import { useExperienceDraft } from "@/lib/experience-draft";
import { LINKABLE_ROUTES, resolveRouteId } from "../../../../lib/site-experience";

/** Owner-configured announcement strip, shown only on the routes the owner selected. */
export function AnnouncementBar() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { data } = useSiteContentSettings();
  const a = data.experience.announcement;
  const routeId = resolveRouteId(location);
  if (!a.enabled || !a.text[language] || !a.routes.includes(routeId)) return null;
  const tone = a.tone === "gold"
    ? "bg-[color:var(--m-gold-soft)] text-[color:var(--m-ink)]"
    : a.tone === "green" ? "bg-[color:var(--m-primary)] text-[color:var(--m-surface)]" : "bg-[color:var(--m-surface)] text-[color:var(--m-ink)]";
  return (
    <div className={`relative z-40 border-b border-[color:var(--m-line)] ${tone}`} data-testid="announcement-bar" role="status">
      <div className="m-container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm">
        <span>{a.text[language]}</span>
        {a.linkRoute && a.linkLabel[language] && (
          <Link href={LINKABLE_ROUTES[a.linkRoute]} className="font-semibold underline decoration-[color:var(--m-gold)] underline-offset-4" data-testid="link-announcement">{a.linkLabel[language]}</Link>
        )}
      </div>
    </div>
  );
}

/** Per-route eyebrow (pageChrome). Rendered above page content for every route except home (which has its own hero). */
export function RouteEyebrow() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const { data } = useSiteContentSettings();
  const routeId = resolveRouteId(location);
  if (routeId === "home") return null;
  const chrome = data.experience.pageChrome[routeId];
  if (!chrome.showEyebrow || !chrome.eyebrow[language]) return null;
  const siteName = language === "ar" ? data.brand.siteNameAr : data.brand.siteNameEn;
  return (
    <div className="m-container pt-5" data-testid="route-eyebrow">
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-[color:var(--m-muted)]">
        <Link href="/" className="hover:text-[color:var(--m-primary)]">{siteName}</Link>
        <span className="h-1 w-1 rounded-full bg-[color:var(--m-gold)]" />
        <span className="font-semibold text-[color:var(--m-primary)]">{chrome.eyebrow[language]}</span>
      </nav>
    </div>
  );
}

/** Visible only while the owner previews an unsaved draft in this tab. */
export function DraftPreviewBar() {
  const { draft, setDraft } = useExperienceDraft();
  const [, navigate] = useLocation();
  if (!draft) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" data-testid="draft-preview-bar">
      <div className="m-card flex flex-wrap items-center gap-3 border border-[color:var(--m-gold)] px-4 py-2.5 text-sm shadow-2xl" dir="rtl">
        <Eye size={16} className="text-[color:var(--m-gold)]" />
        <span className="font-semibold">معاينة مسودة غير محفوظة — لا يراها أحد غيرك في هذا التبويب</span>
        <button type="button" onClick={() => navigate("/admin")} className="m-btn m-btn-primary m-btn-sm" data-testid="button-draft-back">العودة للتحرير</button>
        <button type="button" onClick={() => setDraft(null)} className="m-btn m-btn-ghost m-btn-sm" data-testid="button-draft-exit"><X size={14} />إنهاء المعاينة</button>
      </div>
    </div>
  );
}
