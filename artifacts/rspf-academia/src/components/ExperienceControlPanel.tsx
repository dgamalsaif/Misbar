import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Eye, EyeOff, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { SiteContentSettings } from "@/lib/siteContentSettings";
import { useExperienceDraft } from "@/lib/experience-draft";
import { FONT_FAMILIES } from "@/components/ThemeSync";
import {
  ADMIN_VIEW_IDS, BACKGROUND_PATTERNS, BODY_FONTS, BUTTON_STYLES, CARD_STYLES, DEFAULT_EXPERIENCE_SETTINGS, DENSITIES,
  EXPERIENCE_LIMITS, HEADING_FONTS, LINKABLE_ROUTE_IDS, RADIUS_SCALES, ROUTE_IDS, ROUTE_LABELS, THEME_PRESET_VALUES,
  ANNOUNCEMENT_TONES, checkExperienceSettings,
  type BiText, type ExperienceSettings, type HomeSectionId, type LinkableRouteId, type NavItem, type RouteId, type TextCard,
} from "../../../../lib/site-experience";

interface Props {
  settings: SiteContentSettings;
  onChange: (settings: SiteContentSettings) => void;
}

type Tab = "theme" | "nav" | "footer" | "home" | "pages" | "chrome" | "seo" | "announce";
const TABS: { id: Tab; label: string }[] = [
  { id: "theme", label: "الهوية البصرية" },
  { id: "nav", label: "القائمة العلوية" },
  { id: "footer", label: "التذييل" },
  { id: "home", label: "الرئيسية" },
  { id: "pages", label: "محتوى الصفحات" },
  { id: "chrome", label: "شارات الصفحات" },
  { id: "seo", label: "SEO" },
  { id: "announce", label: "شريط الإعلان" },
];

const SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: "الواجهة الرئيسية", services: "الخدمات البحثية", programs: "الفرص المفتوحة (بيانات حية)",
  affiliations: "الجامعات والدول", journalTicker: "شريط المجلات", pathways: "المسارات", process: "الخطوات",
  knowledge: "مركز المعرفة", faqTeaser: "تمهيد الأسئلة", cta: "دعوة ختامية",
};
const ROUTE_OPTION_LABEL: Record<LinkableRouteId, string> = {
  home: "الرئيسية /", participant: "الفرص /participant-portal", coordinator: "المنسق /coordinator", specialRequests: "الخدمات /special-requests",
  knowledge: "المعرفة /knowledge-center", about: "عن /about", faq: "الأسئلة /faq", survey: "الاستبيان /survey", register: "التسجيل /register",
};
const PUBLIC_SEO_ROUTES: RouteId[] = ROUTE_IDS.filter((r) => !["admin", "adminSubmissions", "coordinatorDashboard", "coordinatorSubmissions", "ownerAdmin", "signIn", "signUp"].includes(r));

const PRESET_PRESENTATION = {
  misbar: { label: "هوية مسبار", note: "أخضر عميق ولمسات نحاسية", mood: "متوازن وأصيل" },
  oasis: { label: "واحة", note: "هدوء أخضر ولمعان ذهبي", mood: "هادئ ومنفتح" },
  sandstone: { label: "رمال هادئة", note: "دفء حجري ومساحات عاجية", mood: "دافئ ومطمئن" },
  nightClinic: { label: "عيادة هادئة", note: "أخضر سريري ولمسات ذهبية", mood: "مركّز ومعاصر" },
  royalSapphire: { label: "ياقوت ملكي", note: "أزرق أرشيفي وتفاصيل شامخة", mood: "رصين وأكاديمي" },
  velvetBurgundy: { label: "مخمل عنّابي", note: "عنّابي غني ولمسات برونزية", mood: "ثقافي وأنيق" },
  midnightGold: { label: "ذهب منتصف الليل", note: "كحلي عميق ولمسات ذهبية", mood: "رصين وكلاسيكي" },
  pearlBronze: { label: "لؤلؤ وبرونز", note: "لؤلؤ دافئ ونحاس معتّق", mood: "ناعم ومميز" },
  custom: { label: "ألوان مخصصة", note: "ابنِ لوحة مسبار الخاصة بك", mood: "على ذوقك" },
} as const;

const PRESET_ORDER = ["misbar", "royalSapphire", "velvetBurgundy", "midnightGold", "pearlBronze", "oasis", "sandstone", "nightClinic", "custom"] as const;
const inputCls = "w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-bg)] px-3 py-2 text-sm outline-none focus:border-[color:var(--m-primary)]";
const labelCls = "mb-1 block text-xs font-semibold text-[color:var(--m-muted)]";

function Bi({ label, value, onChange, multiline, rows = 3, testId }: { label: string; value: BiText; onChange: (v: BiText) => void; multiline?: boolean; rows?: number; testId?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["ar", "en"] as const).map((lang) => (
        <label key={lang} className="block">
          <span className={labelCls}>{label} ({lang === "ar" ? "عربي" : "English"})</span>
          {multiline ? (
            <textarea dir={lang === "ar" ? "rtl" : "ltr"} rows={rows} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} className={`${inputCls} resize-y`} data-testid={testId ? `${testId}-${lang}` : undefined} />
          ) : (
            <input dir={lang === "ar" ? "rtl" : "ltr"} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} className={inputCls} data-testid={testId ? `${testId}-${lang}` : undefined} />
          )}
        </label>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[color:var(--m-primary)]" data-testid={testId} />
      {label}
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange, render }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
      </select>
    </label>
  );
}

function Card({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--m-line)] bg-[color:var(--m-surface)] p-5">
      <h3 className="text-base font-bold text-[color:var(--m-ink)]">{title}</h3>
      {hint && <p className="mt-1 text-xs leading-5 text-[color:var(--m-muted)]">{hint}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowTools({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove?: () => void }) {
  const b = "rounded-lg border border-[color:var(--m-line)] p-1.5 hover:bg-[color:var(--m-primary-soft)]";
  return (
    <div className="flex gap-1">
      <button type="button" onClick={onUp} className={b} aria-label="أعلى"><ArrowUp size={14} /></button>
      <button type="button" onClick={onDown} className={b} aria-label="أسفل"><ArrowDown size={14} /></button>
      {onRemove && <button type="button" onClick={onRemove} className={`${b} text-[#b4372c]`} aria-label="حذف"><Trash2 size={14} /></button>}
    </div>
  );
}

function CardList({ items, onChange, max, addLabel, bodyRows = 3 }: { items: TextCard[]; onChange: (v: TextCard[]) => void; max: number; addLabel: string; bodyRows?: number }) {
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-dashed border-[color:var(--m-line)] p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[color:var(--m-muted)]">
            <span>#{i + 1}</span>
            <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onRemove={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
          <div className="grid gap-3">
            <Bi label="العنوان" value={it.title} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, title: v } : x)))} />
            <Bi label="النص" multiline rows={bodyRows} value={it.body} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, body: v } : x)))} />
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { title: { ar: "", en: "" }, body: { ar: "", en: "" } }])} className="m-btn m-btn-ghost m-btn-sm self-start"><Plus size={14} />{addLabel}</button>
      )}
    </div>
  );
}

function BiListEditor({ label, items, onChange, max }: { label: string; items: BiText[]; onChange: (items: BiText[]) => void; max: number }) {
  return (
    <div className="grid gap-3">
      <div className="text-sm font-semibold">{label}</div>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-dashed border-[color:var(--m-line)] p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[color:var(--m-muted)]">
            <span>عنصر {i + 1}</span>
            <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onRemove={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
          <Bi label="الاسم المعتمد" value={item} onChange={(value) => onChange(items.map((x, k) => (k === i ? value : x)))} />
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { ar: "", en: "" }])} className="m-btn m-btn-ghost m-btn-sm self-start">
          <Plus size={14} />إضافة اسم
        </button>
      )}
    </div>
  );
}

function NavEditor({ items, onChange }: { items: NavItem[]; onChange: (v: NavItem[]) => void }) {
  const unused = LINKABLE_ROUTE_IDS.filter((r) => !items.some((i) => i.route === r));
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={it.route} className="rounded-xl border border-[color:var(--m-line)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold" dir="ltr">{ROUTE_OPTION_LABEL[it.route]}</span>
            <div className="flex flex-wrap items-center gap-3">
              <Toggle label="ظاهر" checked={it.visible} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, visible: v } : x)))} />
              <Toggle label="مميز" checked={it.highlight} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, highlight: v } : x)))} />
              <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onRemove={() => onChange(items.filter((_, k) => k !== i))} />
            </div>
          </div>
          <Bi label="التسمية" value={it.label} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, label: v } : x)))} />
        </div>
      ))}
      {unused.length > 0 && items.length < EXPERIENCE_LIMITS.navItems && (
        <select value="" onChange={(e) => { const r = e.target.value as LinkableRouteId; if (r) onChange([...items, { route: r, label: { ar: "", en: "" }, visible: true, highlight: false }]); }} className={`${inputCls} max-w-xs`} aria-label="إضافة رابط">
          <option value="">+ إضافة رابط لصفحة…</option>
          {unused.map((r) => <option key={r} value={r}>{ROUTE_OPTION_LABEL[r]}</option>)}
        </select>
      )}
    </div>
  );
}

export default function ExperienceControlPanel({ settings, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("theme");
  const [seoRoute, setSeoRoute] = useState<RouteId>("home");
  const [confirmReset, setConfirmReset] = useState(false);
  const [articleIdx, setArticleIdx] = useState(0);
  const { draft, setDraft } = useExperienceDraft();
  const previewing = draft !== null;
  const x = settings.experience;
  const set = (next: ExperienceSettings) => onChange({
    ...settings,
    primaryColor: next.theme.primary,
    accentColor: next.theme.gold,
    cardBackgroundColor: next.theme.surface,
    experience: next,
  });
  const check = useMemo(() => checkExperienceSettings(x), [x]);

  // Keep the in-memory preview in sync while previewing. Never persisted, tab-local only.
  const setDraftRef = useRef(setDraft);
  setDraftRef.current = setDraft;
  useEffect(() => { if (previewing) setDraftRef.current(settings); }, [settings, previewing]);
  // Leaving the panel ends preview so nothing lingers unexpectedly.
  useEffect(() => () => setDraftRef.current(null), []);

  const th = x.theme;
  const c = x.content;
  const articles = c.knowledge.articles;
  const article = articles[articleIdx];

  return (
    <section className="space-y-5 rounded-3xl border border-[color:var(--m-line)] bg-[color:var(--m-bg)] p-4 sm:p-6" dir="rtl" data-testid="experience-control-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[color:var(--m-gold)]">مسبار — تجربة الموقع</p>
          <h2 className="m-display mt-1 text-2xl font-bold text-[color:var(--m-ink)]">التصميم والقوائم والأقسام وSEO لكل صفحة</h2>
          <p className="mt-1 text-sm text-[color:var(--m-muted)]">التغييرات هنا محلية حتى تضغط «حفظ التغييرات» في الأعلى. المعاينة تعمل في هذا التبويب فقط ولا تُحفظ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDraft(previewing ? null : settings)} className={`m-btn m-btn-sm ${previewing ? "m-btn-gold" : "m-btn-ghost"}`} data-testid="button-toggle-preview">
            {previewing ? <EyeOff size={15} /> : <Eye size={15} />}{previewing ? "إيقاف المعاينة الحية" : "معاينة حية (غير محفوظة)"}
          </button>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} className="m-btn m-btn-ghost m-btn-sm" data-testid="button-reset-experience"><RotateCcw size={15} />استعادة الافتراضي</button>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-[#b4372c]/40 bg-[#b4372c]/5 px-3 py-1 text-xs" role="alertdialog" aria-label="تأكيد الاستعادة">
              <AlertTriangle size={14} className="text-[#b4372c]" />
              <span>ستُستبدل كل إعدادات التجربة بالافتراضي (يلزم الحفظ بعدها). متأكد؟</span>
              <button type="button" onClick={() => { set(structuredClone(DEFAULT_EXPERIENCE_SETTINGS)); setConfirmReset(false); }} className="m-btn m-btn-sm bg-[#b4372c] text-white" data-testid="button-confirm-reset">نعم، استعادة</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="m-btn m-btn-ghost m-btn-sm" data-testid="button-cancel-reset">إلغاء</button>
            </div>
          )}
        </div>
      </div>

      {previewing && <p className="rounded-xl bg-[color:var(--m-gold-soft)] px-4 py-2 text-sm">المعاينة الحية مفعّلة: افتح أي صفحة في هذا التبويب لترى المسودة. الزوار الآخرون يرون النسخة المحفوظة فقط.</p>}
      {!check.ok && (
        <p className="flex items-start gap-2 rounded-xl border border-[#b4372c]/40 bg-[#b4372c]/5 px-4 py-2 text-sm text-[#b4372c]" data-testid="text-experience-invalid">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />لن يُقبل الحفظ حتى يُصحَّح: <span dir="ltr">{check.error}</span>
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-full border border-[color:var(--m-line)] bg-[color:var(--m-surface)] p-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} data-active={tab === t.id} className="m-nav-link shrink-0 whitespace-nowrap" data-testid={`tab-experience-${t.id}`}>{t.label}</button>
        ))}
      </div>

      {tab === "theme" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="اختر هوية مسبار" hint="قارن اللوحات بصرياً، ثم خصّص الألوان يدوياً. ينطبق الاختيار على الصفحات والبوابات ولوحات المالك.">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="قوالب الهوية البصرية">
              {PRESET_ORDER.map((preset) => {
                const colors = preset === "custom" ? th : THEME_PRESET_VALUES[preset];
                const item = PRESET_PRESENTATION[preset];
                const selected = th.preset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set({ ...x, theme: preset === "custom" ? { ...th, preset } : { ...th, preset, ...THEME_PRESET_VALUES[preset] } })}
                    className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--m-primary)] ${selected ? "border-[color:var(--m-primary)] shadow-[0_8px_24px_-16px_var(--m-primary)] ring-1 ring-[color:var(--m-primary)]" : "border-[color:var(--m-line)] hover:border-[color:var(--m-gold)]"}`}
                    style={{ backgroundColor: colors.surface, color: colors.ink }}
                    data-testid={`button-theme-preset-${preset}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-extrabold">{item.label}</span>
                        <span className="mt-1 block text-[11px] leading-5 opacity-70">{item.note}</span>
                      </span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${selected ? "text-white" : "border"}`} style={{ backgroundColor: selected ? colors.primary : "transparent", borderColor: colors.primary, color: selected ? colors.surface : colors.primary }}>
                        {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                      </span>
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-3">
                      <span className="flex items-center -space-x-1.5 rtl:space-x-reverse" aria-label="ألوان القالب">
                        {[colors.primary, colors.gold, colors.ink, colors.background, colors.surface].map((color, index) => (
                          <span key={`${color}-${index}`} className="h-5 w-5 rounded-full border-2" style={{ backgroundColor: color, borderColor: colors.surface }} />
                        ))}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-65"><Sparkles size={11} />{item.mood}</span>
                    </span>
                    <span className="mt-3 block overflow-hidden rounded-xl border text-right" style={{ borderColor: `${colors.primary}25`, backgroundColor: colors.background }}>
                      <span className="flex items-center justify-between px-2.5 py-2">
                          <span className="text-[10px] font-extrabold" style={{ color: colors.primary }}>مسبار</span>
                        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: colors.gold }} />
                      </span>
                      <span className="mx-2.5 mb-2 block rounded-lg p-2" style={{ backgroundColor: colors.surface }}>
                        <span className="block h-1.5 w-2/3 rounded-full opacity-80" style={{ backgroundColor: colors.ink }} />
                        <span className="mt-1.5 flex items-center justify-between">
                          <span className="h-1 w-1/3 rounded-full opacity-30" style={{ backgroundColor: colors.ink }} />
                          <span className="rounded-full px-2 py-1 text-[8px] font-bold" style={{ backgroundColor: colors.primary, color: colors.surface }}>استكشف الفرص</span>
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
                {(["primary", "gold", "ink", "background", "surface"] as const).map((k) => (
                  <label key={k} className="block">
                    <span className={labelCls}>{{ primary: "الأساسي", gold: "الذهبي", ink: "النص", background: "الخلفية", surface: "البطاقات" }[k]}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={th[k]} onChange={(e) => set({ ...x, theme: { ...th, preset: "custom", [k]: e.target.value } })} className="h-9 w-10 cursor-pointer rounded border border-[color:var(--m-line)]" data-testid={`input-color-${k}`} />
                      <input value={th[k]} dir="ltr" onChange={(e) => set({ ...x, theme: { ...th, preset: "custom", [k]: e.target.value } })} className={inputCls} />
                    </div>
                  </label>
                ))}
            </div>
          </Card>
          <Card title="الخطوط والمقاسات">
            <Select label="خط العناوين" value={th.headingFont} options={HEADING_FONTS} render={(v) => FONT_FAMILIES[v].label} onChange={(v) => set({ ...x, theme: { ...th, headingFont: v } })} />
            <Select label="خط النص" value={th.bodyFont} options={BODY_FONTS} render={(v) => FONT_FAMILIES[v].label} onChange={(v) => set({ ...x, theme: { ...th, bodyFont: v } })} />
            <label className="block"><span className={labelCls}>حجم النص الأساسي: {th.baseFontSize}px</span>
              <input type="range" min={EXPERIENCE_LIMITS.fontMin} max={EXPERIENCE_LIMITS.fontMax} value={th.baseFontSize} onChange={(e) => set({ ...x, theme: { ...th, baseFontSize: Number(e.target.value) } })} className="w-full accent-[color:var(--m-primary)]" /></label>
            <label className="block"><span className={labelCls}>مقياس العناوين الكبيرة: {th.headingScale.toFixed(2)}×</span>
              <input type="range" min={EXPERIENCE_LIMITS.headingScaleMin} max={EXPERIENCE_LIMITS.headingScaleMax} step={0.05} value={th.headingScale} onChange={(e) => set({ ...x, theme: { ...th, headingScale: Number(e.target.value) } })} className="w-full accent-[color:var(--m-primary)]" /></label>
          </Card>
          <Card title="الأشكال والإيقاع">
            <div className="grid grid-cols-2 gap-3">
              <Select label="استدارة الزوايا" value={th.radius} options={RADIUS_SCALES} render={(v) => ({ sharp: "حادة", soft: "ناعمة", round: "دائرية" }[v])} onChange={(v) => set({ ...x, theme: { ...th, radius: v } })} />
              <Select label="شكل الأزرار" value={th.buttonStyle} options={BUTTON_STYLES} render={(v) => ({ pill: "كبسولة", rounded: "مستديرة", square: "مربعة" }[v])} onChange={(v) => set({ ...x, theme: { ...th, buttonStyle: v } })} />
              <Select label="نمط البطاقات" value={th.cardStyle} options={CARD_STYLES} render={(v) => ({ elevated: "مرتفعة", outline: "بإطار", flat: "مسطحة", tinted: "ملونة" }[v])} onChange={(v) => set({ ...x, theme: { ...th, cardStyle: v } })} />
              <Select label="زخرفة الخلفية" value={th.backgroundPattern} options={BACKGROUND_PATTERNS} render={(v) => ({ none: "بدون", contour: "خطوط كنتورية", dots: "نقاط", arches: "أقواس" }[v])} onChange={(v) => set({ ...x, theme: { ...th, backgroundPattern: v } })} />
              <Select label="كثافة المسافات" value={th.density} options={DENSITIES} render={(v) => ({ compact: "مضغوطة", comfortable: "مريحة", airy: "واسعة" }[v])} onChange={(v) => set({ ...x, theme: { ...th, density: v } })} />
            </div>
            <Toggle label="حركات الظهور" checked={th.motion} onChange={(v) => set({ ...x, theme: { ...th, motion: v } })} />
          </Card>
          <Card title="معاينة مصغرة">
            <div className="rounded-[var(--m-radius)] p-5" style={{ background: th.background, color: th.ink }}>
              <p style={{ fontFamily: FONT_FAMILIES[th.headingFont].css, color: th.primary, fontSize: `${1.6 * th.headingScale}rem`, fontWeight: 700 }}>مسبار</p>
              <p style={{ fontFamily: FONT_FAMILIES[th.bodyFont].css, fontSize: th.baseFontSize }}>نص تجريبي لمعاينة الخط والألوان.</p>
              <span className="mt-3 inline-block px-4 py-2 text-sm font-semibold" style={{ background: th.primary, color: th.surface, borderRadius: { pill: "999px", rounded: ".85rem", square: ".3rem" }[th.buttonStyle] }}>زر أساسي</span>
              <span className="ms-2 inline-block px-4 py-2 text-sm font-semibold" style={{ background: th.gold, color: th.ink, borderRadius: { pill: "999px", rounded: ".85rem", square: ".3rem" }[th.buttonStyle] }}>زر ذهبي</span>
            </div>
          </Card>
        </div>
      )}

      {tab === "nav" && (
        <div className="grid gap-4">
          <Card title="روابط القائمة" hint="مسارات الصفحات ثابتة، يمكنك تغيير التسمية والترتيب والظهور فقط.">
            <NavEditor items={x.navigation.items} onChange={(items) => set({ ...x, navigation: { ...x.navigation, items } })} />
          </Card>
          <Card title="عناصر إضافية">
            <div className="flex flex-wrap gap-4">
              <Toggle label="زر التواصل" checked={x.navigation.showContactButton} onChange={(v) => set({ ...x, navigation: { ...x.navigation, showContactButton: v } })} />
              <Toggle label="تبديل العملة" checked={x.navigation.showCurrency} onChange={(v) => set({ ...x, navigation: { ...x.navigation, showCurrency: v } })} />
              <Toggle label="تبديل اللغة" checked={x.navigation.showLanguage} onChange={(v) => set({ ...x, navigation: { ...x.navigation, showLanguage: v } })} />
              <Toggle label="زر تثبيت التطبيق" checked={x.navigation.showInstall} onChange={(v) => set({ ...x, navigation: { ...x.navigation, showInstall: v } })} />
              <Toggle label="الشعار النصي" checked={x.navigation.showTagline} onChange={(v) => set({ ...x, navigation: { ...x.navigation, showTagline: v } })} />
            </div>
            <Bi label="الشعار النصي" value={x.navigation.tagline} onChange={(v) => set({ ...x, navigation: { ...x.navigation, tagline: v } })} />
          </Card>
        </div>
      )}

      {tab === "footer" && (
        <div className="grid gap-4">
          <Card title="نصوص التذييل">
            <Bi label="نبذة" multiline value={x.footer.tagline} onChange={(v) => set({ ...x, footer: { ...x.footer, tagline: v } })} />
            <Bi label="حقوق النشر" value={x.footer.copyright} onChange={(v) => set({ ...x, footer: { ...x.footer, copyright: v } })} />
            <Bi label="إخلاء المسؤولية" multiline value={x.footer.disclaimer} onChange={(v) => set({ ...x, footer: { ...x.footer, disclaimer: v } })} />
            <div className="flex flex-wrap gap-4">
              <Toggle label="عمود الروابط" checked={x.footer.showLinks} onChange={(v) => set({ ...x, footer: { ...x.footer, showLinks: v } })} />
              <Toggle label="عمود التواصل" checked={x.footer.showContact} onChange={(v) => set({ ...x, footer: { ...x.footer, showContact: v } })} />
            </div>
          </Card>
          <Card title="روابط التذييل">
            <Bi label="عنوان العمود" value={x.footer.linksTitle} onChange={(v) => set({ ...x, footer: { ...x.footer, linksTitle: v } })} />
            <NavEditor items={x.footer.links} onChange={(links) => set({ ...x, footer: { ...x.footer, links } })} />
          </Card>
        </div>
      )}

      {tab === "home" && (
        <div className="grid gap-4">
          <Card title="ترتيب وظهور الأقسام">
            {x.home.sections.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-[color:var(--m-line)] px-3 py-2">
                <Toggle label={SECTION_LABELS[s.id]} checked={s.visible} onChange={(v) => set({ ...x, home: { ...x.home, sections: x.home.sections.map((y, k) => (k === i ? { ...y, visible: v } : y)) } })} testId={`toggle-home-${s.id}`} />
                <RowTools onUp={() => set({ ...x, home: { ...x.home, sections: move(x.home.sections, i, -1) } })} onDown={() => set({ ...x, home: { ...x.home, sections: move(x.home.sections, i, 1) } })} />
              </div>
            ))}
          </Card>
          <Card title="الواجهة (Hero)" hint="إن كان لصفحة الرئيسية في «النصوص» أعلاه عنوان أو وصف أو محتوى مخصص، فإنه يظهر أيضاً هنا.">
            <Bi label="سطر تمهيدي" value={x.home.hero.eyebrow} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, eyebrow: v } } })} />
            <Bi label="العنوان" value={x.home.hero.title} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, title: v } } })} />
            <Bi label="الجزء المميز" value={x.home.hero.highlight} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, highlight: v } } })} />
            <Bi label="الوصف" multiline value={x.home.hero.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, subtitle: v } } })} />
            {(["primaryCta", "secondaryCta"] as const).map((k) => (
              <div key={k} className="grid gap-3 rounded-xl border border-dashed border-[color:var(--m-line)] p-3">
                <Bi label={k === "primaryCta" ? "الزر الأساسي" : "الزر الثانوي"} value={x.home.hero[k].label} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, [k]: { ...x.home.hero[k], label: v } } } })} />
                <Select label="الوجهة" value={x.home.hero[k].route} options={LINKABLE_ROUTE_IDS} render={(v) => ROUTE_OPTION_LABEL[v]} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, [k]: { ...x.home.hero[k], route: v } } } })} />
              </div>
            ))}
            <label className="block"><span className={labelCls}>رابط الصورة (https:// أو مسار يبدأ بـ /)</span>
              <input dir="ltr" value={x.home.hero.imageUrl} onChange={(e) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, imageUrl: e.target.value } } })} className={inputCls} data-testid="input-hero-image" /></label>
            <Bi label="وصف الصورة (alt)" value={x.home.hero.imageAlt} onChange={(v) => set({ ...x, home: { ...x.home, hero: { ...x.home.hero, imageAlt: v } } })} />
          </Card>
          <Card title="الخدمات في الصفحة الرئيسية">
            <Bi label="عنوان القسم" value={x.home.services.title} onChange={(v) => set({ ...x, home: { ...x.home, services: { ...x.home.services, title: v } } })} />
            <Bi label="الوصف" multiline value={x.home.services.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, services: { ...x.home.services, subtitle: v } } })} />
            <p className="text-xs leading-5 text-[color:var(--m-muted)]">بطاقات الخدمات نفسها تُعدّل من تبويب «محتوى الصفحات» ثم قسم «الخدمات».</p>
          </Card>
          <Card title="الفرص المفتوحة" hint="تُعرض من /api/programs مباشرة — لا بيانات تجريبية.">
            <Bi label="العنوان" value={x.home.programs.title} onChange={(v) => set({ ...x, home: { ...x.home, programs: { ...x.home.programs, title: v } } })} />
            <Bi label="الوصف" value={x.home.programs.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, programs: { ...x.home.programs, subtitle: v } } })} />
            <Bi label="نص عدم وجود فرص" multiline value={x.home.programs.emptyText} onChange={(v) => set({ ...x, home: { ...x.home, programs: { ...x.home.programs, emptyText: v } } })} />
            <Bi label="زر عرض الكل" value={x.home.programs.viewAllLabel} onChange={(v) => set({ ...x, home: { ...x.home, programs: { ...x.home.programs, viewAllLabel: v } } })} />
            <label className="block max-w-xs"><span className={labelCls}>عدد البطاقات ({EXPERIENCE_LIMITS.programsMin}–{EXPERIENCE_LIMITS.programsMax})</span>
              <input type="number" min={EXPERIENCE_LIMITS.programsMin} max={EXPERIENCE_LIMITS.programsMax} value={x.home.programs.limit} onChange={(e) => set({ ...x, home: { ...x.home, programs: { ...x.home.programs, limit: Number(e.target.value) } } })} className={inputCls} /></label>
          </Card>
          <Card title="المسارات">
            <Bi label="العنوان" value={x.home.pathways.title} onChange={(v) => set({ ...x, home: { ...x.home, pathways: { ...x.home.pathways, title: v } } })} />
            <Bi label="الوصف" value={x.home.pathways.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, pathways: { ...x.home.pathways, subtitle: v } } })} />
            <CardList items={x.home.pathways.items} max={EXPERIENCE_LIMITS.pathwayItems} addLabel="إضافة مسار" onChange={(items) => set({ ...x, home: { ...x.home, pathways: { ...x.home.pathways, items } } })} />
          </Card>
          <Card title="الجامعات والدول" hint="القوائم تعريفية وقابلة للتعديل، وذكر اسم جهة لا يعني وجود شراكة أو اعتماد رسمي.">
            <Bi label="عنوان القسم" value={x.home.affiliations.title} onChange={(v) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, title: v } } })} />
            <Bi label="الوصف" multiline value={x.home.affiliations.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, subtitle: v } } })} />
            <Bi label="عنوان قائمة الدول" value={x.home.affiliations.countriesTitle} onChange={(v) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, countriesTitle: v } } })} />
            <BiListEditor label="الدول" items={x.home.affiliations.countries} max={EXPERIENCE_LIMITS.homeAffiliationItems} onChange={(countries) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, countries } } })} />
            <Bi label="عنوان قائمة الجامعات" value={x.home.affiliations.universitiesTitle} onChange={(v) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, universitiesTitle: v } } })} />
            <BiListEditor label="الجامعات" items={x.home.affiliations.universities} max={EXPERIENCE_LIMITS.homeAffiliationItems} onChange={(universities) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, universities } } })} />
            <Toggle label="تحريك شرائط الدول والجامعات" checked={x.home.affiliations.animationEnabled} onChange={(animationEnabled) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, animationEnabled } } })} testId="toggle-affiliation-animation" />
            <label className="block max-w-md">
              <span className={labelCls}>مدة دورة الحركة: {x.home.affiliations.animationDurationSeconds} ثانية (الرقم الأقل أسرع)</span>
              <input type="range" min={EXPERIENCE_LIMITS.marqueeDurationMinSeconds} max={EXPERIENCE_LIMITS.marqueeDurationMaxSeconds} value={x.home.affiliations.animationDurationSeconds} onChange={(e) => set({ ...x, home: { ...x.home, affiliations: { ...x.home.affiliations, animationDurationSeconds: Number(e.target.value) } } })} className="w-full accent-[color:var(--m-primary)]" data-testid="input-affiliation-animation-speed" />
            </label>
          </Card>
          <Card title="شريط المجلات المتحرك" hint="يعرض أسماء المجلات الموجودة في قائمة خيارات الفرص فقط، من دون شعارات أو ادعاء شراكة أو ضمان نشر.">
            <Bi label="عنوان القسم" value={x.home.journalTicker.title} onChange={(v) => set({ ...x, home: { ...x.home, journalTicker: { ...x.home.journalTicker, title: v } } })} />
            <Bi label="الوصف" multiline value={x.home.journalTicker.subtitle} onChange={(v) => set({ ...x, home: { ...x.home, journalTicker: { ...x.home.journalTicker, subtitle: v } } })} />
            <Toggle label="تحريك شريط المجلات" checked={x.home.journalTicker.animationEnabled} onChange={(animationEnabled) => set({ ...x, home: { ...x.home, journalTicker: { ...x.home.journalTicker, animationEnabled } } })} testId="toggle-journal-animation" />
            <label className="block max-w-md">
              <span className={labelCls}>مدة دورة الحركة: {x.home.journalTicker.animationDurationSeconds} ثانية (الرقم الأقل أسرع)</span>
              <input type="range" min={EXPERIENCE_LIMITS.marqueeDurationMinSeconds} max={EXPERIENCE_LIMITS.marqueeDurationMaxSeconds} value={x.home.journalTicker.animationDurationSeconds} onChange={(e) => set({ ...x, home: { ...x.home, journalTicker: { ...x.home.journalTicker, animationDurationSeconds: Number(e.target.value) } } })} className="w-full accent-[color:var(--m-primary)]" data-testid="input-journal-animation-speed" />
            </label>
            <p className="text-xs leading-5 text-[color:var(--m-muted)]">تُدار أسماء المجلات من إعدادات الفرص، وتظهر هنا تلقائياً بعد حفظها.</p>
          </Card>
          <Card title="الخطوات">
            <Bi label="العنوان" value={x.home.process.title} onChange={(v) => set({ ...x, home: { ...x.home, process: { ...x.home.process, title: v } } })} />
            <CardList items={x.home.process.steps} max={EXPERIENCE_LIMITS.processSteps} addLabel="إضافة خطوة" onChange={(steps) => set({ ...x, home: { ...x.home, process: { ...x.home.process, steps } } })} />
          </Card>
          {(["knowledge", "faqTeaser"] as const).map((k) => (
            <Card key={k} title={SECTION_LABELS[k]}>
              <Bi label="العنوان" value={x.home[k].title} onChange={(v) => set({ ...x, home: { ...x.home, [k]: { ...x.home[k], title: v } } })} />
              <Bi label="النص" multiline value={x.home[k].body} onChange={(v) => set({ ...x, home: { ...x.home, [k]: { ...x.home[k], body: v } } })} />
              <Bi label="نص الزر" value={x.home[k].ctaLabel} onChange={(v) => set({ ...x, home: { ...x.home, [k]: { ...x.home[k], ctaLabel: v } } })} />
            </Card>
          ))}
          <Card title="الدعوة الختامية">
            <Bi label="العنوان" value={x.home.cta.title} onChange={(v) => set({ ...x, home: { ...x.home, cta: { ...x.home.cta, title: v } } })} />
            <Bi label="النص" multiline value={x.home.cta.body} onChange={(v) => set({ ...x, home: { ...x.home, cta: { ...x.home.cta, body: v } } })} />
            <Bi label="نص الزر" value={x.home.cta.label} onChange={(v) => set({ ...x, home: { ...x.home, cta: { ...x.home.cta, label: v } } })} />
            <Select label="الوجهة" value={x.home.cta.route} options={LINKABLE_ROUTE_IDS} render={(v) => ROUTE_OPTION_LABEL[v]} onChange={(v) => set({ ...x, home: { ...x.home, cta: { ...x.home.cta, route: v } } })} />
          </Card>
        </div>
      )}

      {tab === "pages" && (
        <div className="grid gap-4">
          <p className="text-xs text-[color:var(--m-muted)]">عناوين الصفحات ووصفها الرئيسي تُدار من قسم «نصوص الصفحات» أعلى هذه اللوحة. هنا محتوى الأقسام داخل كل صفحة.</p>
          <Card title="عن مسبار /about">
            <Bi label="المقدمة" multiline value={c.about.intro} onChange={(v) => set({ ...x, content: { ...c, about: { ...c.about, intro: v } } })} />
            <Bi label="عنوان الأقسام" value={c.about.sectionsTitle} onChange={(v) => set({ ...x, content: { ...c, about: { ...c.about, sectionsTitle: v } } })} />
            <CardList items={c.about.sections} max={EXPERIENCE_LIMITS.aboutItems} addLabel="إضافة قسم" onChange={(sections) => set({ ...x, content: { ...c, about: { ...c.about, sections } } })} />
            <Bi label="عنوان القيم" value={c.about.valuesTitle} onChange={(v) => set({ ...x, content: { ...c, about: { ...c.about, valuesTitle: v } } })} />
            <CardList items={c.about.values} max={EXPERIENCE_LIMITS.aboutItems} addLabel="إضافة قيمة" onChange={(values) => set({ ...x, content: { ...c, about: { ...c.about, values } } })} />
            <Bi label="عنوان ما نقدمه" value={c.about.offersTitle} onChange={(v) => set({ ...x, content: { ...c, about: { ...c.about, offersTitle: v } } })} />
            {c.about.offers.map((o, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1"><Bi label={`بند ${i + 1}`} value={o} onChange={(v) => set({ ...x, content: { ...c, about: { ...c.about, offers: c.about.offers.map((y, k) => (k === i ? v : y)) } } })} /></div>
                <RowTools onUp={() => set({ ...x, content: { ...c, about: { ...c.about, offers: move(c.about.offers, i, -1) } } })} onDown={() => set({ ...x, content: { ...c, about: { ...c.about, offers: move(c.about.offers, i, 1) } } })} onRemove={() => set({ ...x, content: { ...c, about: { ...c.about, offers: c.about.offers.filter((_, k) => k !== i) } } })} />
              </div>
            ))}
            {c.about.offers.length < EXPERIENCE_LIMITS.offers && <button type="button" onClick={() => set({ ...x, content: { ...c, about: { ...c.about, offers: [...c.about.offers, { ar: "", en: "" }] } } })} className="m-btn m-btn-ghost m-btn-sm self-start"><Plus size={14} />إضافة بند</button>}
          </Card>

          <Card title="الأسئلة الشائعة /faq">
            {c.faq.items.map((q, i) => (
              <div key={i} className="rounded-xl border border-dashed border-[color:var(--m-line)] p-3">
                <div className="mb-2 flex justify-between text-xs font-semibold text-[color:var(--m-muted)]"><span>سؤال {i + 1}</span>
                  <RowTools onUp={() => set({ ...x, content: { ...c, faq: { ...c.faq, items: move(c.faq.items, i, -1) } } })} onDown={() => set({ ...x, content: { ...c, faq: { ...c.faq, items: move(c.faq.items, i, 1) } } })} onRemove={() => set({ ...x, content: { ...c, faq: { ...c.faq, items: c.faq.items.filter((_, k) => k !== i) } } })} /></div>
                <div className="grid gap-3">
                  <Bi label="السؤال" value={q.q} onChange={(v) => set({ ...x, content: { ...c, faq: { ...c.faq, items: c.faq.items.map((y, k) => (k === i ? { ...y, q: v } : y)) } } })} />
                  <Bi label="الإجابة" multiline value={q.a} onChange={(v) => set({ ...x, content: { ...c, faq: { ...c.faq, items: c.faq.items.map((y, k) => (k === i ? { ...y, a: v } : y)) } } })} />
                </div>
              </div>
            ))}
            {c.faq.items.length < EXPERIENCE_LIMITS.faqItems && <button type="button" onClick={() => set({ ...x, content: { ...c, faq: { ...c.faq, items: [...c.faq.items, { q: { ar: "", en: "" }, a: { ar: "", en: "" } }] } } })} className="m-btn m-btn-ghost m-btn-sm self-start" data-testid="button-add-faq"><Plus size={14} />إضافة سؤال</button>}
            <Bi label="عنوان صندوق التواصل" value={c.faq.contactTitle} onChange={(v) => set({ ...x, content: { ...c, faq: { ...c.faq, contactTitle: v } } })} />
            <Bi label="نص صندوق التواصل" value={c.faq.contactBody} onChange={(v) => set({ ...x, content: { ...c, faq: { ...c.faq, contactBody: v } } })} />
          </Card>

          <Card title="الخدمات /special-requests">
            <CardList items={c.services.items} max={EXPERIENCE_LIMITS.serviceItems} addLabel="إضافة خدمة" onChange={(items) => set({ ...x, content: { ...c, services: { ...c.services, items } } })} />
            <Bi label="زر طلب الخدمة" value={c.services.requestLabel} onChange={(v) => set({ ...x, content: { ...c, services: { ...c.services, requestLabel: v } } })} />
            <Bi label="عنوان التواصل" value={c.services.contactTitle} onChange={(v) => set({ ...x, content: { ...c, services: { ...c.services, contactTitle: v } } })} />
            <Bi label="نص التواصل" value={c.services.contactBody} onChange={(v) => set({ ...x, content: { ...c, services: { ...c.services, contactBody: v } } })} />
          </Card>

          <Card title="مركز المعرفة والمقالات /knowledge-center" hint="أضف مقالاً بنفس slug لمقال موجود لتعديله أو إخفائه، أو slug جديد لمقال جديد. النص: سطر فارغ = فقرة جديدة، «## » = عنوان، «- » = نقطة.">
            <Bi label="مقدمة المركز" multiline value={c.knowledge.intro} onChange={(v) => set({ ...x, content: { ...c, knowledge: { ...c.knowledge, intro: v } } })} />
            <div className="flex flex-wrap items-center gap-2">
              {articles.map((a, i) => (
                <button key={i} type="button" onClick={() => setArticleIdx(i)} data-active={i === articleIdx} className="m-nav-link border border-[color:var(--m-line)]" dir="ltr">{a.slug || "(بدون slug)"}</button>
              ))}
              {articles.length < EXPERIENCE_LIMITS.articles && (
                <button type="button" onClick={() => { set({ ...x, content: { ...c, knowledge: { ...c.knowledge, articles: [...articles, { slug: "", hidden: false, featured: false, category: { ar: "", en: "" }, title: { ar: "", en: "" }, excerpt: { ar: "", en: "" }, readTime: { ar: "", en: "" }, date: "", body: { ar: "", en: "" } }] } } }); setArticleIdx(articles.length); }} className="m-btn m-btn-ghost m-btn-sm" data-testid="button-add-article"><Plus size={14} />مقال / تعديل مقال</button>
              )}
            </div>
            {article && (() => {
              const upd = (patch: Partial<typeof article>) => set({ ...x, content: { ...c, knowledge: { ...c.knowledge, articles: articles.map((y, k) => (k === articleIdx ? { ...y, ...patch } : y)) } } });
              return (
                <div className="grid gap-3 rounded-xl border border-[color:var(--m-line)] p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="block flex-1"><span className={labelCls}>slug (a-z, 0-9, -)</span><input dir="ltr" value={article.slug} onChange={(e) => upd({ slug: e.target.value.toLowerCase() })} className={inputCls} data-testid="input-article-slug" /></label>
                    <label className="block"><span className={labelCls}>التاريخ</span><input type="date" dir="ltr" value={article.date} onChange={(e) => upd({ date: e.target.value })} className={inputCls} /></label>
                    <Toggle label="مميز" checked={article.featured} onChange={(v) => upd({ featured: v })} />
                    <Toggle label="مخفي" checked={article.hidden} onChange={(v) => upd({ hidden: v })} />
                    <button type="button" onClick={() => { set({ ...x, content: { ...c, knowledge: { ...c.knowledge, articles: articles.filter((_, k) => k !== articleIdx) } } }); setArticleIdx(0); }} className="m-btn m-btn-ghost m-btn-sm text-[#b4372c]"><Trash2 size={14} />حذف التعديل</button>
                  </div>
                  <Bi label="العنوان" value={article.title} onChange={(v) => upd({ title: v })} />
                  <Bi label="التصنيف" value={article.category} onChange={(v) => upd({ category: v })} />
                  <Bi label="الملخص" multiline value={article.excerpt} onChange={(v) => upd({ excerpt: v })} />
                  <Bi label="مدة القراءة" value={article.readTime} onChange={(v) => upd({ readTime: v })} />
                  <Bi label="نص المقال (فارغ = يبقى النص الأصلي)" multiline rows={10} value={article.body} onChange={(v) => upd({ body: v })} testId="input-article-body" />
                </div>
              );
            })()}
          </Card>

          <Card title="التسجيل /survey و /register">
            <Bi label="عنوان الاستمارة" value={c.registration.heading} onChange={(v) => set({ ...x, content: { ...c, registration: { ...c.registration, heading: v } } })} />
            <Bi label="وصف الاستمارة" multiline value={c.registration.subheading} onChange={(v) => set({ ...x, content: { ...c, registration: { ...c.registration, subheading: v } } })} />
            <Bi label="زر الإرسال" value={c.registration.submitLabel} onChange={(v) => set({ ...x, content: { ...c, registration: { ...c.registration, submitLabel: v } } })} />
            <Bi label="عنوان النجاح" value={c.registration.successTitle} onChange={(v) => set({ ...x, content: { ...c, registration: { ...c.registration, successTitle: v } } })} />
            <Bi label="رسالة النجاح" multiline value={c.registration.successBody} onChange={(v) => set({ ...x, content: { ...c, registration: { ...c.registration, successBody: v } } })} />
          </Card>

          <Card title="بوابة المشارك /participant-portal">
            <Bi label="مقدمة إضافية" multiline value={c.participant.intro} onChange={(v) => set({ ...x, content: { ...c, participant: { ...c.participant, intro: v } } })} />
            <Bi label="نص عدم وجود فرص" value={c.participant.emptyText} onChange={(v) => set({ ...x, content: { ...c, participant: { ...c.participant, emptyText: v } } })} />
          </Card>

          <Card title="لوحة الإدارة /admin" hint="تسميات التبويبات تظهر بالعربية (اللوحة عربية). الحقل الإنجليزي محفوظ للاستخدام المستقبلي.">
            {ADMIN_VIEW_IDS.map((id) => (
              <Bi key={id} label={`تبويب ${id}`} value={c.admin.navLabels[id]} onChange={(v) => set({ ...x, content: { ...c, admin: { ...c.admin, navLabels: { ...c.admin.navLabels, [id]: v } } } })} />
            ))}
            <Bi label="رسالة ترحيب أعلى اللوحة (فارغ = مخفية)" value={c.admin.welcome} onChange={(v) => set({ ...x, content: { ...c, admin: { ...c.admin, welcome: v } } })} />
          </Card>

          <Card title="صفحة غير موجودة (404)">
            <Bi label="العنوان" value={c.notFound.title} onChange={(v) => set({ ...x, content: { ...c, notFound: { ...c.notFound, title: v } } })} />
            <Bi label="النص" value={c.notFound.body} onChange={(v) => set({ ...x, content: { ...c, notFound: { ...c.notFound, body: v } } })} />
            <Bi label="نص الزر" value={c.notFound.ctaLabel} onChange={(v) => set({ ...x, content: { ...c, notFound: { ...c.notFound, ctaLabel: v } } })} />
          </Card>
        </div>
      )}

      {tab === "chrome" && (
        <Card title="شارة المسار أعلى كل صفحة" hint="تظهر كمسار تنقل صغير أعلى الصفحات (عدا الرئيسية التي لها واجهتها الخاصة).">
          {ROUTE_IDS.filter((r) => r !== "home").map((r) => (
            <div key={r} className="rounded-xl border border-[color:var(--m-line)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold"><span>{ROUTE_LABELS[r].ar} <span dir="ltr" className="text-[color:var(--m-muted)]">{ROUTE_LABELS[r].path}</span></span>
                <Toggle label="ظاهرة" checked={x.pageChrome[r].showEyebrow} onChange={(v) => set({ ...x, pageChrome: { ...x.pageChrome, [r]: { ...x.pageChrome[r], showEyebrow: v } } })} /></div>
              <Bi label="الشارة" value={x.pageChrome[r].eyebrow} onChange={(v) => set({ ...x, pageChrome: { ...x.pageChrome, [r]: { ...x.pageChrome[r], eyebrow: v } } })} />
            </div>
          ))}
        </Card>
      )}

      {tab === "seo" && (
        <Card title="SEO لكل مسار" hint="في صفحات المقال وتفاصيل الفرصة استخدم {title} و{description} لإدراج بيانات الصفحة. تجنب أي وعود بالقبول أو النشر.">
          <Select<RouteId> label="المسار" value={seoRoute} options={ROUTE_IDS} render={(r) => `${ROUTE_LABELS[r].ar} — ${ROUTE_LABELS[r].path}${PUBLIC_SEO_ROUTES.includes(r) ? "" : " (خاص)"}`} onChange={setSeoRoute} />
          <Bi label="عنوان الصفحة (title)" value={x.seo[seoRoute].title} onChange={(v) => set({ ...x, seo: { ...x.seo, [seoRoute]: { ...x.seo[seoRoute], title: v } } })} testId="input-seo-title" />
          <Bi label="الوصف (meta description)" multiline value={x.seo[seoRoute].description} onChange={(v) => set({ ...x, seo: { ...x.seo, [seoRoute]: { ...x.seo[seoRoute], description: v } } })} />
          <label className="block"><span className={labelCls}>صورة المشاركة (og:image)</span>
            <input dir="ltr" value={x.seo[seoRoute].imageUrl} onChange={(e) => set({ ...x, seo: { ...x.seo, [seoRoute]: { ...x.seo[seoRoute], imageUrl: e.target.value } } })} className={inputCls} /></label>
          <Toggle label="منع الفهرسة (noindex)" checked={x.seo[seoRoute].noIndex} onChange={(v) => set({ ...x, seo: { ...x.seo, [seoRoute]: { ...x.seo[seoRoute], noIndex: v } } })} />
          {!PUBLIC_SEO_ROUTES.includes(seoRoute) && <p className="text-xs text-[color:var(--m-muted)]">الصفحات الخاصة تبقى غير مفهرسة دائماً بغض النظر عن هذا الخيار.</p>}
          <div className="rounded-xl bg-[color:var(--m-surface)] p-3 text-sm" dir="ltr">
            <p className="text-[#1a0dab]">{x.seo[seoRoute].title.ar || x.seo[seoRoute].title.en}</p>
            <p className="text-xs text-[color:var(--m-muted)]">{(x.seo[seoRoute].description.ar || x.seo[seoRoute].description.en).slice(0, 160)}</p>
          </div>
        </Card>
      )}

      {tab === "announce" && (
        <Card title="شريط الإعلان">
          <Toggle label="مفعّل" checked={x.announcement.enabled} onChange={(v) => set({ ...x, announcement: { ...x.announcement, enabled: v } })} testId="toggle-announcement" />
          <Bi label="النص" value={x.announcement.text} onChange={(v) => set({ ...x, announcement: { ...x.announcement, text: v } })} />
          <Bi label="نص الرابط" value={x.announcement.linkLabel} onChange={(v) => set({ ...x, announcement: { ...x.announcement, linkLabel: v } })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="وجهة الرابط" value={x.announcement.linkRoute} options={["", ...LINKABLE_ROUTE_IDS] as const} render={(v) => (v ? ROUTE_OPTION_LABEL[v] : "بدون رابط")} onChange={(v) => set({ ...x, announcement: { ...x.announcement, linkRoute: v } })} />
            <Select label="اللون" value={x.announcement.tone} options={ANNOUNCEMENT_TONES} render={(v) => ({ gold: "ذهبي", green: "أخضر", neutral: "محايد" }[v])} onChange={(v) => set({ ...x, announcement: { ...x.announcement, tone: v } })} />
          </div>
          <div>
            <span className={labelCls}>يظهر في:</span>
            <div className="flex flex-wrap gap-3">
              {ROUTE_IDS.map((r) => (
                <Toggle key={r} label={ROUTE_LABELS[r].ar} checked={x.announcement.routes.includes(r)} onChange={(v) => set({ ...x, announcement: { ...x.announcement, routes: v ? [...x.announcement.routes, r] : x.announcement.routes.filter((y) => y !== r) } })} />
              ))}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
