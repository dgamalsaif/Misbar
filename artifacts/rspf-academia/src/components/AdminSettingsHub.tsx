import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Palette,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SettingsView = "settings" | "portal-settings" | "content-settings" | "data-management";
type SettingsCategory = "identity" | "opportunities" | "catalog" | "registration" | "operations";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  keywords: string;
  category: SettingsCategory;
  icon: LucideIcon;
  view: SettingsView;
  focusSection?: string;
}

const categories: Array<{ id: "all" | SettingsCategory; label: string; icon: LucideIcon }> = [
  { id: "all", label: "كل الإعدادات", icon: Settings2 },
  { id: "identity", label: "الهوية والمحتوى", icon: Palette },
  { id: "opportunities", label: "الفرص والظهور", icon: Eye },
  { id: "catalog", label: "التخصصات والمجلات", icon: ClipboardList },
  { id: "registration", label: "التسجيل والمتطلبات", icon: FileCheck2 },
  { id: "operations", label: "التشغيل والحساب", icon: ShieldCheck },
];

const settingItems: SettingItem[] = [
  {
    id: "identity",
    title: "هوية الموقع والتواصل",
    description: "اسم الموقع والشعار والأيقونة والألوان وقنوات التواصل.",
    keywords: "اسم شعار لوجو أيقونة تطبيق لون هاتف بريد انستغرام فيسبوك هوية",
    category: "identity",
    icon: Palette,
    view: "content-settings",
    focusSection: "settings-identity",
  },
  {
    id: "appearance",
    title: "المظهر والتنسيق",
    description: "الخطوط والألوان والمسافات وطريقة عرض الموقع.",
    keywords: "مظهر تنسيق theme ألوان واجهة خط حجم",
    category: "identity",
    icon: SlidersHorizontal,
    view: "content-settings",
    focusSection: "settings-experience",
  },
  {
    id: "pages",
    title: "نصوص الصفحات العامة",
    description: "العناوين والوصف والمحتوى الظاهر في صفحات الموقع.",
    keywords: "الرئيسية عن الأكاديمية المعرفة الأسئلة الشائعة تفاصيل الفرصة نص محتوى",
    category: "identity",
    icon: Globe2,
    view: "content-settings",
    focusSection: "settings-public-pages",
  },
  {
    id: "portal-copy",
    title: "نصوص البوابات والنماذج",
    description: "العناوين والإرشادات الظاهرة للمشارك والمنسق.",
    keywords: "مشارك منسق بوابة وصف عنوان نموذج",
    category: "identity",
    icon: FileText,
    view: "content-settings",
    focusSection: "settings-portal-copy",
  },
  {
    id: "invoice",
    title: "إعدادات الفاتورة",
    description: "بيانات الجهة وشعار الفاتورة والختم ومحتواها.",
    keywords: "فاتورة شعار ختم رسوم ضريبة مستند طباعة",
    category: "identity",
    icon: WalletCards,
    view: "content-settings",
    focusSection: "settings-invoice",
  },
  {
    id: "watermark",
    title: "العلامة المائية",
    description: "التحكم بظهور العلامة المائية في الفرص.",
    keywords: "علامة مائية ختم حماية عنوان الفرصة",
    category: "identity",
    icon: ShieldCheck,
    view: "content-settings",
    focusSection: "settings-watermark",
  },
  {
    id: "opportunity-visibility",
    title: "ظهور تفاصيل الفرص",
    description: "تحديد التفاصيل التي تظهر للزوار في صفحات الفرص.",
    keywords: "إخفاء إظهار عنوان تخصص وصف صورة خصوصية فرصة بحث",
    category: "opportunities",
    icon: Eye,
    view: "content-settings",
    focusSection: "settings-opportunity-visibility",
  },
  {
    id: "opportunity-filters",
    title: "فلاتر البحث والفرز",
    description: "اختيار الفلاتر الظاهرة للزوار وترتيبها.",
    keywords: "بحث بلد دولة سعر رسوم تخصص مقاعد موعد إغلاق فلتر",
    category: "opportunities",
    icon: Search,
    view: "content-settings",
    focusSection: "settings-opportunity-filters",
  },
  {
    id: "opportunity-layout",
    title: "طريقة عرض الفرص",
    description: "اختيار عرض الفرص كبطاقات أو شريط تمرير.",
    keywords: "بطاقات شبكة شريط أفقي ترتيب تصميم",
    category: "opportunities",
    icon: LayoutDashboard,
    view: "content-settings",
    focusSection: "settings-opportunity-layout",
  },
  {
    id: "specialties",
    title: "التخصصات وروابط المجموعات",
    description: "إدارة أسماء التخصصات وروابط مجموعاتها.",
    keywords: "تخصصات واتساب تيليجرام مجموعات طب",
    category: "catalog",
    icon: UsersRound,
    view: "content-settings",
    focusSection: "settings-specialties",
  },
  {
    id: "journals",
    title: "المجلات والفهرسة العلمية",
    description: "إدارة أسماء المجلات وبيانات الفهرسة وترتيبها.",
    keywords: "مجلة نشر ISSN PubMed Scopus Web of Science",
    category: "catalog",
    icon: ClipboardList,
    view: "content-settings",
    focusSection: "settings-journals",
  },
  {
    id: "registration-fields",
    title: "حقول التسجيل",
    description: "تعديل الحقول وتسمياتها وظهورها للمشارك والمنسق.",
    keywords: "تسجيل دولة جوال واتساب بريد اسم حقل مشارك منسق",
    category: "registration",
    icon: FileCheck2,
    view: "content-settings",
    focusSection: "settings-registration-fields",
  },
  {
    id: "registration-requirements",
    title: "متطلبات التسجيل والشروط",
    description: "إدارة الدرجة والخبرات وإقرار الرسوم والمهام.",
    keywords: "شروط رسوم مهام درجة أكاديمية خبرة بحثية موافقة",
    category: "registration",
    icon: ShieldCheck,
    view: "content-settings",
    focusSection: "settings-registration-requirements",
  },
  {
    id: "redirects",
    title: "التحويل وإعادة التوجيه",
    description: "تحديد الوجهة بعد إرسال طلب التسجيل.",
    keywords: "رابط واتساب بريد تيليجرام مشارك منسق بعد التسجيل",
    category: "registration",
    icon: Send,
    view: "content-settings",
    focusSection: "settings-redirect",
  },
  {
    id: "coordinator-portal",
    title: "إعدادات بوابة المنسقين",
    description: "ضبط تجربة المنسق ونصوص بوابته.",
    keywords: "منسق بوابة إعدادات تسجيل طلاب",
    category: "operations",
    icon: LayoutDashboard,
    view: "portal-settings",
  },
  {
    id: "account-security",
    title: "الحساب والأمان",
    description: "إعدادات حساب المالك والوصول إلى لوحة الإدارة.",
    keywords: "مالك حساب أمان رمز وصول صلاحيات",
    category: "operations",
    icon: LockKeyhole,
    view: "settings",
  },
  {
    id: "data-management",
    title: "إدارة البيانات",
    description: "أدوات المالك لإدارة بيانات المنصة.",
    keywords: "بيانات تصدير استيراد إدارة",
    category: "operations",
    icon: ClipboardList,
    view: "data-management",
  },
];

interface AdminSettingsHubProps {
  onNavigate: (view: SettingsView, focusSection?: string) => void;
  showDataManagement: boolean;
}

export default function AdminSettingsHub({ onNavigate, showDataManagement }: AdminSettingsHubProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | SettingsCategory>("all");
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    return settingItems.filter((item) => {
      if (!showDataManagement && item.id === "data-management") return false;
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const searchableText = `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase("ar");
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [activeCategory, query, showDataManagement]);

  return (
    <section dir="rtl" className="rounded-3xl border border-[color:var(--m-line)] bg-[color:var(--m-bg)] p-4 text-[color:var(--m-ink)] sm:p-6" data-testid="admin-settings-hub">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-[color:var(--m-primary)]">إدارة المنصة</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">مركز إعدادات مسبار</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">اختر ما تريد تعديله للوصول مباشرة إلى القسم المناسب. تبقى صلاحيات الحفظ وإعدادات كل قسم كما هي.</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--m-line)] bg-[color:var(--m-surface)] px-4 py-3 text-xs leading-5 text-slate-600">
          افتح القسم لإجراء التعديل، ثم احفظ من داخله.
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="تصنيفات إعدادات الموقع" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {categories.map((category) => {
            const Icon = category.icon;
            const active = activeCategory === category.id;
            const count = settingItems.filter((item) =>
              (showDataManagement || item.id !== "data-management") &&
              (category.id === "all" || item.category === category.id),
            ).length;
            return (
              <button
                key={category.id}
                type="button"
                data-testid={`admin-settings-category-${category.id}`}
                aria-pressed={active}
                onClick={() => setActiveCategory(category.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-right text-xs font-bold transition lg:w-full ${
                  active ? "bg-[color:var(--m-primary)] text-white shadow-sm" : "bg-[color:var(--m-surface)] text-slate-600 hover:bg-white"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="flex-1 whitespace-nowrap lg:whitespace-normal">{category.label}</span>
                <span className={active ? "text-white/75" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">{activeCategory === "all" ? "الإعدادات المتاحة" : categories.find((item) => item.id === activeCategory)?.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{visibleItems.length} أقسام متاحة</p>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">ابحث في الإعدادات</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن إعداد..."
                data-testid="admin-settings-search"
                className="h-11 w-full rounded-xl border border-[color:var(--m-line)] bg-[color:var(--m-surface)] pr-10 pl-3 text-sm outline-none transition focus:border-[color:var(--m-primary)] focus:ring-2 focus:ring-[color:var(--m-primary)]/15"
              />
            </label>
          </div>

          {visibleItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`admin-settings-card-${item.id}`}
                    onClick={() => onNavigate(item.view, item.focusSection)}
                    className="group flex min-h-32 flex-col rounded-2xl border border-[color:var(--m-line)] bg-[color:var(--m-surface)] p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--m-primary)]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--m-primary)]"
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--m-primary-soft)] text-[color:var(--m-primary)]">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--m-line)] text-slate-400 transition group-hover:text-[color:var(--m-primary)]">
                        <ArrowLeft size={15} aria-hidden="true" />
                      </span>
                    </span>
                    <span className="mt-4 text-sm font-black">{item.title}</span>
                    <span className="mt-1 text-xs leading-5 text-slate-500">{item.description}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--m-line)] bg-[color:var(--m-surface)] px-5 py-12 text-center">
              <Search size={22} aria-hidden="true" className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-sm font-black">لم نعثر على إعداد بهذا الاسم</h3>
              <p className="mt-1 text-xs text-slate-500">جرّب كلمة أخرى أو اختر تصنيفاً مختلفاً.</p>
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveCategory("all"); }}
                className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-[color:var(--m-primary)] hover:bg-[color:var(--m-primary-soft)]"
              >
                عرض كل الإعدادات
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
