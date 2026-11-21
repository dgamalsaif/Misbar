/**
 * Misbar / مسبار — shared site experience contract.
 * Pure TypeScript, no runtime dependencies. Used by frontend (rendering + owner panel)
 * and backend (validation on PUT, sanitizing on read).
 *
 * - sanitizeExperienceSettings(input): lenient. Never throws. Missing or invalid values fall back to defaults.
 * - validateExperienceSettings(input): strict. Absent input/keys are accepted (defaults applied);
 *   any SUPPLIED value that is invalid throws an Error with a descriptive path.
 */

/* ------------------------------------------------------------------ enums */

export const ROUTE_IDS = [
  "home", "participant", "coordinator", "specialRequests", "knowledge", "knowledgeArticle",
  "about", "faq", "researchDetail", "survey", "register", "admin", "adminSubmissions",
  "coordinatorDashboard", "coordinatorSubmissions", "ownerAdmin", "signIn", "signUp", "notFound",
] as const;
export type RouteId = typeof ROUTE_IDS[number];

/** Routes that may appear as navigation/footer/CTA destinations (route slugs are fixed, never editable). */
export const LINKABLE_ROUTES = {
  home: "/", participant: "/participant-portal", coordinator: "/coordinator", specialRequests: "/special-requests",
  knowledge: "/knowledge-center", about: "/about", faq: "/faq", survey: "/survey", register: "/register",
} as const;
export type LinkableRouteId = keyof typeof LINKABLE_ROUTES;
export const LINKABLE_ROUTE_IDS = Object.keys(LINKABLE_ROUTES) as LinkableRouteId[];

export const PRIVATE_ROUTE_IDS: RouteId[] = ["admin", "adminSubmissions", "coordinatorDashboard", "coordinatorSubmissions", "ownerAdmin", "signIn", "signUp", "coordinator"];

export const THEME_PRESETS = ["misbar", "oasis", "sandstone", "nightClinic", "custom"] as const;
export const HEADING_FONTS = ["readex", "amiri", "tajawal", "ibmPlexArabic", "notoKufi"] as const;
export const BODY_FONTS = ["ibmPlexArabic", "tajawal", "readex", "notoNaskh"] as const;
export const RADIUS_SCALES = ["sharp", "soft", "round"] as const;
export const BUTTON_STYLES = ["pill", "rounded", "square"] as const;
export const CARD_STYLES = ["elevated", "outline", "flat", "tinted"] as const;
export const BACKGROUND_PATTERNS = ["none", "contour", "dots", "arches"] as const;
export const DENSITIES = ["compact", "comfortable", "airy"] as const;
export const HOME_SECTION_IDS = ["hero", "services", "journalTicker", "programs", "pathways", "process", "affiliations", "knowledge", "faqTeaser", "cta"] as const;
const LEGACY_DEFAULT_HOME_SECTION_ORDER = ["hero", "services", "programs", "affiliations", "journalTicker", "pathways", "process", "knowledge", "faqTeaser", "cta"] as const;
export const ANNOUNCEMENT_TONES = ["gold", "green", "neutral"] as const;

export type ThemePreset = typeof THEME_PRESETS[number];
export type HeadingFont = typeof HEADING_FONTS[number];
export type BodyFont = typeof BODY_FONTS[number];
export type RadiusScale = typeof RADIUS_SCALES[number];
export type ButtonStyle = typeof BUTTON_STYLES[number];
export type CardStyle = typeof CARD_STYLES[number];
export type BackgroundPattern = typeof BACKGROUND_PATTERNS[number];
export type Density = typeof DENSITIES[number];
export type HomeSectionId = typeof HOME_SECTION_IDS[number];
export type AnnouncementTone = typeof ANNOUNCEMENT_TONES[number];

/* ------------------------------------------------------------------ types */

export interface BiText { ar: string; en: string }

export interface ThemeSettings {
  preset: ThemePreset;
  primary: string;      // #rrggbb deep green
  gold: string;         // #rrggbb accent
  ink: string;          // text
  background: string;   // page tint
  surface: string;      // cards/modals
  headingFont: HeadingFont;
  bodyFont: BodyFont;
  baseFontSize: number; // px, 14..19
  headingScale: number; // 0.85..1.3
  radius: RadiusScale;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  backgroundPattern: BackgroundPattern;
  density: Density;
  motion: boolean;
}

export interface NavItem { route: LinkableRouteId; label: BiText; visible: boolean; highlight: boolean }

export interface NavigationSettings {
  items: NavItem[];
  showContactButton: boolean;
  showCurrency: boolean;
  showLanguage: boolean;
  showInstall: boolean;
  showTagline: boolean;
  tagline: BiText;
}

export interface FooterSettings {
  tagline: BiText;
  showContact: boolean;
  showLinks: boolean;
  linksTitle: BiText;
  links: NavItem[];
  copyright: BiText;
  disclaimer: BiText;
}

export interface HomeSection { id: HomeSectionId; visible: boolean }
export interface TextCard { title: BiText; body: BiText }

export interface HomeSettings {
  sections: HomeSection[];
  hero: {
    eyebrow: BiText; title: BiText; highlight: BiText; subtitle: BiText;
    primaryCta: { label: BiText; route: LinkableRouteId };
    secondaryCta: { label: BiText; route: LinkableRouteId };
    imageUrl: string; imageAlt: BiText;
  };
  services: { title: BiText; subtitle: BiText };
  programs: { title: BiText; subtitle: BiText; limit: number; emptyText: BiText; viewAllLabel: BiText };
  pathways: { title: BiText; subtitle: BiText; items: TextCard[] };
  affiliations: {
    title: BiText;
    subtitle: BiText;
    countriesTitle: BiText;
    universitiesTitle: BiText;
    countries: BiText[];
    universities: BiText[];
    animationEnabled: boolean;
    animationDurationSeconds: number;
  };
  journalTicker: { title: BiText; subtitle: BiText; animationEnabled: boolean; animationDurationSeconds: number };
  process: { title: BiText; steps: TextCard[] };
  knowledge: { title: BiText; body: BiText; ctaLabel: BiText };
  faqTeaser: { title: BiText; body: BiText; ctaLabel: BiText };
  cta: { title: BiText; body: BiText; label: BiText; route: LinkableRouteId };
}

export interface PageChrome { eyebrow: BiText; showEyebrow: boolean }

export interface SeoEntry { title: BiText; description: BiText; imageUrl: string; noIndex: boolean }

export interface AnnouncementSettings {
  enabled: boolean;
  text: BiText;
  linkLabel: BiText;
  linkRoute: LinkableRouteId | "";
  tone: AnnouncementTone;
  routes: RouteId[];
}

export interface ExperienceSettings {
  version: 2;
  theme: ThemeSettings;
  navigation: NavigationSettings;
  footer: FooterSettings;
  home: HomeSettings;
  pageChrome: Record<RouteId, PageChrome>;
  seo: Record<RouteId, SeoEntry>;
  announcement: AnnouncementSettings;
  content: ContentSettings;
}

/* ------------------------------------------------------------------ per-route content */

export interface QA { q: BiText; a: BiText }

export interface ArticleEntry {
  slug: string;            // [a-z0-9-], fixed route segment for /knowledge-center/:slug
  hidden: boolean;
  featured: boolean;
  category: BiText;
  title: BiText;
  excerpt: BiText;
  readTime: BiText;
  date: string;            // YYYY-MM-DD or ""
  /** Plain text. Blank line = new paragraph, "## " = heading, "- " = bullet. Empty = keep built-in body. */
  body: BiText;
}

export const ADMIN_VIEW_IDS = ["programs", "payments", "settings", "portal-settings", "content-settings", "data-management"] as const;
export type AdminViewId = typeof ADMIN_VIEW_IDS[number];

export interface ContentSettings {
  about: { intro: BiText; sectionsTitle: BiText; sections: TextCard[]; valuesTitle: BiText; values: TextCard[]; offersTitle: BiText; offers: BiText[] };
  faq: { items: QA[]; contactTitle: BiText; contactBody: BiText };
  services: { items: TextCard[]; requestLabel: BiText; contactTitle: BiText; contactBody: BiText };
  knowledge: { intro: BiText; articles: ArticleEntry[] };
  registration: { heading: BiText; subheading: BiText; submitLabel: BiText; successTitle: BiText; successBody: BiText };
  participant: { intro: BiText; emptyText: BiText };
  admin: { navLabels: Record<AdminViewId, BiText>; welcome: BiText };
  notFound: { title: BiText; body: BiText; ctaLabel: BiText };
}

/* ------------------------------------------------------------------ limits */

export const EXPERIENCE_LIMITS = {
  shortText: 120,
  mediumText: 320,
  longText: 1200,
  url: 600,
  navItems: 10,
  pathwayItems: 6,
  processSteps: 6,
  programsMin: 0,
  programsMax: 12,
  fontMin: 14,
  fontMax: 19,
  headingScaleMin: 0.85,
  headingScaleMax: 1.3,
  totalJsonBytes: 400_000,
  articleBody: 12_000,
  articles: 30,
  faqItems: 40,
  serviceItems: 12,
  aboutItems: 8,
  offers: 12,
  homeAffiliationItems: 24,
  marqueeDurationMinSeconds: 12,
  marqueeDurationMaxSeconds: 90,
} as const;

/* ------------------------------------------------------------------ defaults */

const t = (ar: string, en: string): BiText => ({ ar, en });
const nav = (route: LinkableRouteId, ar: string, en: string, highlight = false, visible = true): NavItem => ({ route, label: t(ar, en), visible, highlight });

export const THEME_PRESET_VALUES: Record<Exclude<ThemePreset, "custom">, Pick<ThemeSettings, "primary" | "gold" | "ink" | "background" | "surface">> = {
  misbar: { primary: "#065634", gold: "#d4af37", ink: "#18352b", background: "#f3f5ef", surface: "#fffdf8" },
  oasis: { primary: "#0f6b55", gold: "#b8892a", ink: "#102620", background: "#eef4ee", surface: "#fbfdf9" },
  sandstone: { primary: "#2f5d3a", gold: "#a8742a", ink: "#2a2117", background: "#f4ede0", surface: "#fffaf0" },
  nightClinic: { primary: "#0e3d36", gold: "#d2a744", ink: "#0f1c1a", background: "#e9ece6", surface: "#fafbf6" },
};
const LEGACY_MISBAR_THEME_VALUES = {
  primary: "#0b5145",
  gold: "#c69b35",
  ink: "#14231f",
  background: "#f3f1e7",
  surface: "#fffdf6",
};

const chrome = (ar: string, en: string): PageChrome => ({ eyebrow: t(ar, en), showEyebrow: true });
const seo = (tAr: string, tEn: string, dAr: string, dEn: string, noIndex = false): SeoEntry => ({ title: t(tAr, tEn), description: t(dAr, dEn), imageUrl: "", noIndex });

export const DEFAULT_EXPERIENCE_SETTINGS: ExperienceSettings = {
  version: 2,
  theme: {
    preset: "misbar",
    ...THEME_PRESET_VALUES.misbar,
    headingFont: "readex",
    bodyFont: "ibmPlexArabic",
    baseFontSize: 16,
    headingScale: 1,
    radius: "soft",
    buttonStyle: "pill",
    cardStyle: "elevated",
    backgroundPattern: "contour",
    density: "comfortable",
    motion: true,
  },
  navigation: {
    items: [
      nav("home", "الرئيسية", "Home"),
      nav("participant", "الفرص البحثية", "Opportunities", true),
      nav("knowledge", "مركز المعرفة", "Knowledge"),
      nav("specialRequests", "الخدمات", "Services"),
      nav("about", "عن مسبار", "About"),
      nav("faq", "الأسئلة الشائعة", "FAQ"),
      nav("coordinator", "بوابة المنسق", "Coordinators"),
    ],
    showContactButton: true,
    showCurrency: true,
    showLanguage: true,
    showInstall: true,
    showTagline: true,
    tagline: t("مسار الطبيب إلى البحث", "A physician's research path"),
  },
  footer: {
    tagline: t(
      "مسبار مساحة عربية-إنجليزية تساعد الأطباء على قراءة الفرص البحثية بوضوح، واختيار ما يناسب مسارهم المهني والأكاديمي.",
      "Misbar is an Arabic-English space that helps physicians read research opportunities clearly and choose what fits their professional and academic path.",
    ),
    showContact: true,
    showLinks: true,
    linksTitle: t("روابط", "Links"),
    links: [
      nav("participant", "الفرص البحثية", "Opportunities"),
      nav("knowledge", "مركز المعرفة", "Knowledge Center"),
      nav("specialRequests", "الخدمات", "Services"),
      nav("about", "عن مسبار", "About"),
      nav("faq", "الأسئلة الشائعة", "FAQ"),
    ],
    copyright: t("مسبار. جميع الحقوق محفوظة.", "Misbar. All rights reserved."),
    disclaimer: t(
      "المشاركة البحثية تدعم ملفك المهني، لكن القبول في البورد أو الزمالة أو الترقية أو البدلات يخضع لمعايير الجهات المختصة وحدها.",
      "Research participation can strengthen a profile, but board, fellowship, promotion and allowance decisions rest solely with the relevant authorities.",
    ),
  },
  home: {
    sections: HOME_SECTION_IDS.map((id) => ({ id, visible: true })),
    hero: {
      eyebrow: t("منصة بحثية للأطباء", "A research platform for physicians"),
      title: t("اعرف أين تقف،", "Know where you stand,"),
      highlight: t("ثم اختر بحثك بثقة", "then choose your research with confidence"),
      subtitle: t(
        "فرص بحثية طبية موثّقة البيانات، مرتبة حسب التخصص، مع وضوح في المهام والمدة والمجلة المستهدفة — لمن يبني ملفه نحو البورد السعودي، الزمالة، أو الترقية الأكاديمية.",
        "Medical research opportunities with clear data, organized by specialty, with transparent tasks, timelines and target journals — for physicians building toward the Saudi board, a fellowship, or academic promotion.",
      ),
      primaryCta: { label: t("استعرض الفرص المتاحة", "Browse open opportunities"), route: "participant" },
      secondaryCta: { label: t("كيف يعمل مسبار", "How Misbar works"), route: "about" },
      imageUrl: "/misbar-hero.jpg",
      imageAlt: t("مخطوطة طبية وأدوات بحث", "Medical manuscript and research tools"),
    },
    services: {
      title: t("خدمات بحثية مساندة", "Supporting research services"),
      subtitle: t("خيارات عملية للباحثين، مع توضيح نطاق كل خدمة قبل البدء.", "Practical options for researchers, with each service's scope clarified before work begins."),
    },
    programs: {
      title: t("فرص مفتوحة الآن", "Open right now"),
      subtitle: t("بيانات حية من لوحة الإدارة — بلا أمثلة وهمية.", "Live data from the admin board — no placeholder examples."),
      limit: 6,
      emptyText: t("لا توجد فرص مفتوحة في هذه اللحظة. تابع مركز المعرفة أو تواصل معنا لتصلك الفرص القادمة.", "No opportunities are open right now. Explore the Knowledge Center or contact us to hear about upcoming ones."),
      viewAllLabel: t("كل الفرص", "All opportunities"),
    },
    pathways: {
      title: t("لأي مسار تبحث؟", "Which path are you building?"),
      subtitle: t("البحث جزء من الملف، وليس ضماناً للنتيجة.", "Research is part of the profile, not a guarantee of the outcome."),
      items: [
        { title: t("البورد السعودي", "Saudi Board"), body: t("أبحاث تُضاف إلى ملف التقديم وتظهر التزامك العلمي في التخصص.", "Research that adds to an application file and shows scientific commitment in your specialty.") },
        { title: t("الزمالات الطبية", "Medical Fellowships"), body: t("خبرة بحثية منشورة أو قيد النشر تساعد في المقابلات والمفاضلة.", "Published or in-progress research experience that supports interviews and ranking.") },
        { title: t("الترقية الأكاديمية والمهنية", "Academic & Professional Promotion"), body: t("إنتاج علمي في مجلات مفهرسة وفق متطلبات جهتك.", "Scientific output in indexed journals aligned with your institution's requirements.") },
        { title: t("بدل التميز", "Excellence Allowance"), body: t("مساهمات بحثية قد تُحتسب حسب لوائح جهة عملك، دون أي وعد بالاستحقاق.", "Research contributions that may count under your employer's rules — with no promise of eligibility.") },
      ],
    },
    affiliations: {
      title: t("جامعات سعودية ودول المنطقة", "Saudi Universities & Regional Countries"),
      subtitle: t(
        "قائمة تعريفية قابلة للتعديل؛ ذكر الاسم لا يعني وجود شراكة أو اعتماد رسمي.",
        "An editable directory; listing a name does not imply partnership or endorsement.",
      ),
      countriesTitle: t("دول المنطقة", "Countries in the region"),
      universitiesTitle: t("جامعات سعودية", "Saudi universities"),
      countries: [
        t("المملكة العربية السعودية", "Saudi Arabia"),
        t("الإمارات العربية المتحدة", "United Arab Emirates"),
        t("الأردن", "Jordan"),
        t("مصر", "Egypt"),
        t("الكويت", "Kuwait"),
        t("قطر", "Qatar"),
        t("البحرين", "Bahrain"),
        t("سلطنة عُمان", "Oman"),
        t("اليمن", "Yemen"),
      ],
      universities: [
        t("جامعة الملك سعود", "King Saud University"),
        t("جامعة الملك عبدالعزيز", "King Abdulaziz University"),
        t("جامعة الملك فهد للبترول والمعادن", "King Fahd University of Petroleum & Minerals"),
        t("جامعة الملك عبدالله للعلوم والتقنية", "King Abdullah University of Science and Technology"),
        t("جامعة الملك خالد", "King Khalid University"),
        t("جامعة أم القرى", "Umm Al-Qura University"),
        t("جامعة الإمام عبدالرحمن بن فيصل", "Imam Abdulrahman Bin Faisal University"),
        t("جامعة الأميرة نورة بنت عبدالرحمن", "Princess Nourah bint Abdulrahman University"),
        t("جامعة طيبة", "Taibah University"),
        t("جامعة القصيم", "Qassim University"),
        t("جامعة حائل", "University of Hail"),
        t("جامعة جازان", "Jazan University"),
      ],
      animationEnabled: true,
      animationDurationSeconds: 38,
    },
    journalTicker: {
      title: t("مجلات ضمن خيارات الفرص البحثية", "Journals featured in research opportunities"),
      subtitle: t(
        "أسماء المجلات وبيانات الفهرسة كما سُجلت في لوحة الإدارة؛ تحقّق من المتطلبات الحالية لكل مجلة.",
        "Journal names and indexing details reflect the admin records; verify each journal’s current requirements.",
      ),
      animationEnabled: true,
      animationDurationSeconds: 42,
    },
    process: {
      title: t("ثلاث خطوات واضحة", "Three clear steps"),
      steps: [
        { title: t("اقرأ الفرصة", "Read the opportunity"), body: t("التخصص، المقاعد، المدة، المشرف، والمجلة المستهدفة في صفحة واحدة.", "Specialty, seats, duration, supervisor and target journal on one page.") },
        { title: t("سجّل بياناتك", "Register your details"), body: t("نموذج قصير يوضح المهام والرسوم قبل أي التزام.", "A short form that states tasks and fees before any commitment.") },
        { title: t("اعمل ضمن فريق", "Work within a team"), body: t("تنسيق مباشر مع الفريق البحثي حتى مرحلة التقديم للمجلة.", "Direct coordination with the research team through journal submission.") },
      ],
    },
    knowledge: {
      title: t("اقرأ قبل أن تقرر", "Read before you decide"),
      body: t("أدلة عملية عن اختيار المجلات، الفهرسة في PubMed وScopus وWeb of Science، وكيف تُقرأ متطلبات البورد.", "Practical guides on journal selection, PubMed, Scopus and Web of Science indexing, and reading board requirements."),
      ctaLabel: t("ادخل مركز المعرفة", "Open the Knowledge Center"),
    },
    faqTeaser: {
      title: t("أسئلة تتكرر", "Questions we hear often"),
      body: t("الرسوم، المهام، ترتيب الأسماء، والمدة الزمنية — إجابات مباشرة.", "Fees, tasks, authorship order and timelines — direct answers."),
      ctaLabel: t("الأسئلة الشائعة", "Read the FAQ"),
    },
    cta: {
      title: t("ابدأ من الفرصة المناسبة لتخصصك", "Start with the opportunity that fits your specialty"),
      body: t("سجّل اهتمامك، وسنوضح لك التفاصيل قبل الالتزام.", "Register your interest and we will clarify details before you commit."),
      label: t("سجّل اهتمامك", "Register interest"),
      route: "register",
    },
  },
  pageChrome: {
    home: chrome("مسبار", "Misbar"),
    participant: chrome("الفرص البحثية", "Research opportunities"),
    coordinator: chrome("للمنسقين", "For coordinators"),
    specialRequests: chrome("خدمات بحثية", "Research services"),
    knowledge: chrome("مركز المعرفة", "Knowledge Center"),
    knowledgeArticle: chrome("دليل", "Guide"),
    about: chrome("عن مسبار", "About Misbar"),
    faq: chrome("إجابات مباشرة", "Straight answers"),
    researchDetail: chrome("تفاصيل الفرصة", "Opportunity details"),
    survey: chrome("التسجيل", "Registration"),
    register: chrome("التسجيل", "Registration"),
    admin: chrome("لوحة الإدارة", "Admin"),
    adminSubmissions: chrome("السجلات", "Records"),
    coordinatorDashboard: chrome("لوحة المنسق", "Coordinator dashboard"),
    coordinatorSubmissions: chrome("سجلات المنسق", "Coordinator records"),
    ownerAdmin: chrome("دخول المالك", "Owner access"),
    signIn: chrome("تسجيل الدخول", "Sign in"),
    signUp: chrome("إنشاء حساب", "Sign up"),
    notFound: chrome("الصفحة غير موجودة", "Page not found"),
  },
  seo: {
    home: seo("مسبار | فرص بحثية للأطباء: البورد السعودي والزمالة والترقية", "Misbar | Research Opportunities for Physicians",
      "فرص بحثية طبية للأطباء الباحثين عن ملف أقوى للبورد السعودي والزمالات الطبية والترقية الأكاديمية وبدل التميز، مع وضوح في المهام والمجلات المستهدفة.",
      "Medical research opportunities for physicians strengthening their profile for the Saudi board, fellowships, academic promotion and excellence allowance, with clear tasks and target journals."),
    participant: seo("الفرص البحثية للأطباء | مسبار", "Research Opportunities | Misbar",
      "فرص بحثية مفتوحة حسب التخصص لدعم ملف البورد السعودي والزمالة الطبية والترقية الأكاديمية — بدون وعود بالقبول.",
      "Open research opportunities by specialty to support Saudi board, fellowship and academic promotion profiles — without promises of acceptance."),
    coordinator: seo("بوابة المنسق | مسبار", "Coordinator Portal | Misbar", "دخول المنسقين لتسجيل المشاركين.", "Coordinator access for registering participants.", true),
    specialRequests: seo("خدمات بحثية طبية | مسبار", "Medical Research Services | Misbar",
      "تصميم الدراسة، التحليل الإحصائي، واختيار المجلات المفهرسة للأطباء.", "Study design, statistics and indexed journal selection for physicians."),
    knowledge: seo("مركز المعرفة | البورد السعودي والنشر العلمي | مسبار", "Knowledge Center | Boards & Publication | Misbar",
      "أدلة عملية عن أبحاث البورد السعودي، الزمالات، الترقية الأكاديمية، واختيار مجلات PubMed وScopus وWeb of Science.",
      "Practical guides on Saudi board research, fellowships, academic promotion, and selecting PubMed, Scopus and Web of Science journals."),
    knowledgeArticle: seo("{title} | مسبار", "{title} | Misbar", "{description}", "{description}"),
    about: seo("عن مسبار", "About Misbar", "تعرف على مسبار ومنهجه في عرض الفرص البحثية للأطباء بوضوح وأمانة.", "Learn about Misbar and how it presents research opportunities to physicians clearly and honestly."),
    faq: seo("الأسئلة الشائعة | مسبار", "FAQ | Misbar", "إجابات عن الرسوم والمهام والمدة والنشر في الفرص البحثية.", "Answers about fees, tasks, timelines and publication in research opportunities."),
    researchDetail: seo("{title} | فرصة بحثية | مسبار", "{title} | Research Opportunity | Misbar", "{description}", "{description}"),
    survey: seo("التسجيل في فرصة بحثية | مسبار", "Register for a Research Opportunity | Misbar", "سجّل اهتمامك بفرصة بحثية طبية.", "Register your interest in a medical research opportunity."),
    register: seo("التسجيل | مسبار", "Register | Misbar", "سجّل اهتمامك بفرصة بحثية طبية.", "Register your interest in a medical research opportunity."),
    admin: seo("لوحة الإدارة | مسبار", "Admin | Misbar", "", "", true),
    adminSubmissions: seo("السجلات | مسبار", "Records | Misbar", "", "", true),
    coordinatorDashboard: seo("لوحة المنسق | مسبار", "Coordinator Dashboard | Misbar", "", "", true),
    coordinatorSubmissions: seo("سجلات المنسق | مسبار", "Coordinator Records | Misbar", "", "", true),
    ownerAdmin: seo("دخول المالك | مسبار", "Owner Access | Misbar", "", "", true),
    signIn: seo("تسجيل الدخول | مسبار", "Sign in | Misbar", "", "", true),
    signUp: seo("إنشاء حساب | مسبار", "Sign up | Misbar", "", "", true),
    notFound: seo("الصفحة غير موجودة | مسبار", "Page not found | Misbar", "", "", true),
  },
  announcement: {
    enabled: false,
    text: t("", ""),
    linkLabel: t("", ""),
    linkRoute: "",
    tone: "gold",
    routes: ["home", "participant"],
  },
  content: {
    about: {
      intro: t(
        "مسبار منصة عربية-إنجليزية تعرض الفرص البحثية الطبية للأطباء ببيانات واضحة: التخصص، المهام، المدة، المشرف، والمجلة المستهدفة، حتى يقرر الطبيب عن معرفة.",
        "Misbar is an Arabic-English platform that presents medical research opportunities to physicians with clear data — specialty, tasks, timeline, supervisor and target journal — so decisions are informed.",
      ),
      sectionsTitle: t("لماذا مسبار", "Why Misbar"),
      sections: [
        { title: t("الوضوح قبل الالتزام", "Clarity before commitment"), body: t("نعرض المهام والرسوم والمدة قبل التسجيل، ولا نستخدم وعوداً بالنشر أو القبول.", "Tasks, fees and timelines are shown before registration, without promises of publication or acceptance.") },
        { title: t("مسار مهني لا رقم", "A career path, not a number"), body: t("البحث خطوة ضمن ملف البورد أو الزمالة أو الترقية، وتبقى القرارات النهائية للجهات المختصة.", "Research is one step within a board, fellowship or promotion file; final decisions remain with the relevant authorities.") },
      ],
      valuesTitle: t("ما نلتزم به", "What we hold to"),
      values: [
        { title: t("الأمانة العلمية", "Scientific integrity"), body: t("لا أرقام مصطنعة ولا شهادات وهمية.", "No invented metrics and no fabricated testimonials.") },
        { title: t("احترام وقت الطبيب", "Respect for clinicians' time"), body: t("مهام محددة ومدد واقعية.", "Defined tasks and realistic timelines.") },
        { title: t("لغتان بمستوى واحد", "Two languages, one standard"), body: t("كل محتوى بالعربية والإنجليزية.", "Every piece of content in Arabic and English.") },
      ],
      offersTitle: t("ما الذي تجده هنا", "What you will find here"),
      offers: [
        t("فرص بحثية مفتوحة مرتبة حسب التخصص", "Open research opportunities organized by specialty"),
        t("خدمات تصميم الدراسة والتحليل الإحصائي", "Study design and statistical analysis services"),
        t("إرشاد في اختيار المجلات المفهرسة", "Guidance on selecting indexed journals"),
        t("أدلة معرفية عن البورد والزمالة والترقية", "Guides on boards, fellowships and promotion"),
      ],
    },
    faq: {
      items: [
        { q: t("ما هو مسبار؟", "What is Misbar?"), a: t("منصة تعرض فرصاً بحثية طبية للأطباء والباحثين الصحيين بتفاصيل واضحة، مع خدمات بحثية مساندة.", "A platform presenting medical research opportunities to physicians and health researchers with clear details, plus supporting research services.") },
        { q: t("كيف أسجل في فرصة بحثية؟", "How do I register for an opportunity?"), a: t("افتح صفحة الفرص، اختر الفرصة المناسبة لتخصصك، ثم أكمل نموذج التسجيل. يتواصل معك الفريق لتأكيد التفاصيل.", "Open the opportunities page, choose one that fits your specialty, then complete the registration form. The team will contact you to confirm details.") },
        { q: t("هل المشاركة تضمن القبول في البورد أو الزمالة؟", "Does participation guarantee board or fellowship acceptance?"), a: t("لا. البحث يدعم ملفك، لكن القبول والترقية وبدل التميز تخضع لمعايير الجهات المختصة وحدها.", "No. Research supports your file, but acceptance, promotion and excellence allowance decisions rest solely with the relevant authorities.") },
        { q: t("هل النشر مضمون؟", "Is publication guaranteed?"), a: t("لا يوجد نشر مضمون. القرار للمجلة بعد التحكيم، ونوضح المجلة المستهدفة وتصنيفها في كل فرصة.", "No publication is guaranteed. The journal decides after peer review; each opportunity states its target journal and indexing.") },
        { q: t("هل توجد رسوم؟", "Are there fees?"), a: t("بعض الفرص تتضمن رسوم تحليل ونشر، وتظهر بوضوح في صفحة الفرصة ونموذج التسجيل قبل الموافقة.", "Some opportunities include analysis and publication fees, shown clearly on the opportunity page and registration form before you agree.") },
        { q: t("هل أحتاج خبرة بحثية سابقة؟", "Do I need prior research experience?"), a: t("ليس دائماً. نموذج التسجيل يسألك عن خبرتك لتوزيع المهام بشكل مناسب.", "Not always. The registration form asks about your experience so tasks can be assigned appropriately.") },
        { q: t("كم تستغرق الفرصة؟", "How long does an opportunity take?"), a: t("المدة مذكورة في كل فرصة، والنشر يعتمد على دورة التحكيم في المجلة.", "Each opportunity states its duration; publication depends on the journal's review cycle.") },
        { q: t("كيف أتواصل مع الفريق؟", "How do I contact the team?"), a: t("عبر زر التواصل في أعلى الصفحة أو قنوات التواصل في التذييل.", "Use the contact button at the top of the page or the channels in the footer.") },
      ],
      contactTitle: t("سؤالك غير موجود؟", "Question not listed?"),
      contactBody: t("راسلنا وسنجيبك بوضوح.", "Message us and we will answer clearly."),
    },
    services: {
      items: [
        { title: t("إعداد الدراسة البحثية", "Research study preparation"), body: t("تصميم البروتوكول وصياغة السؤال البحثي ومنهجية الدراسة.", "Protocol design, research question framing and study methodology.") },
        { title: t("التحليل الإحصائي", "Statistical analysis"), body: t("تحليل البيانات باستخدام SPSS وR مع تقرير نتائج قابل للنشر.", "Data analysis with SPSS and R, with a publication-ready results report.") },
        { title: t("اختيار المجلة", "Journal selection"), body: t("مطابقة البحث مع مجلات مفهرسة في PubMed وScopus وWeb of Science.", "Matching your manuscript with journals indexed in PubMed, Scopus and Web of Science.") },
        { title: t("رسائل الماجستير والدكتوراه", "Master's and doctoral theses"), body: t("دعم منهجي من اختيار الموضوع حتى الصياغة النهائية.", "Methodological support from topic selection to final write-up.") },
        { title: t("التدقيق والترجمة الأكاديمية", "Academic editing and translation"), body: t("مراجعة لغوية وعلمية بين العربية والإنجليزية.", "Linguistic and scientific review between Arabic and English.") },
        { title: t("طلب آخر", "Another request"), body: t("صف احتياجك وسنرد بما هو ممكن بوضوح.", "Describe your need and we will reply clearly with what is possible.") },
      ],
      requestLabel: t("اطلب هذه الخدمة", "Request this service"),
      contactTitle: t("تفضل التواصل المباشر؟", "Prefer to talk directly?"),
      contactBody: t("تواصل مع الفريق عبر القنوات الرسمية.", "Reach the team through the official channels."),
    },
    knowledge: {
      intro: t("أدلة مكتوبة لأطباء يريدون فهم المتطلبات قبل البدء.", "Written guides for physicians who want to understand requirements before starting."),
      articles: [],
    },
    registration: {
      heading: t("استمارة التسجيل في الفرصة البحثية", "Research opportunity registration"),
      subheading: t("أدخل بياناتك كما في مستنداتك المهنية. نراجع الطلب ثم نتواصل معك.", "Enter your details as in your professional documents. We review the request, then contact you."),
      submitLabel: t("إرسال التسجيل", "Submit registration"),
      successTitle: t("تم استلام تسجيلك", "Registration received"),
      successBody: t("سيتواصل معك الفريق لتأكيد التفاصيل والخطوات التالية.", "The team will contact you to confirm details and next steps."),
    },
    participant: {
      intro: t("", ""),
      emptyText: t("لا توجد فرص مطابقة حالياً.", "No matching opportunities right now."),
    },
    admin: {
      navLabels: {
        programs: t("الفرص البحثية", "Opportunities"),
        payments: t("المدفوعات", "Payments"),
        settings: t("الإعدادات", "Settings"),
        "portal-settings": t("بوابة المنسق", "Coordinator portal"),
        "content-settings": t("المحتوى والمظهر", "Content & design"),
        "data-management": t("إدارة البيانات", "Data management"),
      },
      welcome: t("", ""),
    },
    notFound: {
      title: t("هذه الصفحة غير موجودة", "This page does not exist"),
      body: t("ربما تغير الرابط أو كُتب بشكل غير صحيح.", "The link may have changed or been mistyped."),
      ctaLabel: t("العودة للرئيسية", "Back to home"),
    },
  },
};

/* ------------------------------------------------------------------ guards */

class Strictness {
  constructor(public strict: boolean) {}
  fail(path: string, reason: string): never { throw new Error(`experience.${path}: ${reason}`); }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;
// Reject control characters and markup/CSS injection vectors. Text is rendered as plain React text,
// but we still refuse angle brackets, braces and CSS/JS sigils so nothing looks like code.
const UNSAFE_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>`\\]|javascript:|expression\s*\(|url\s*\(|@import/i;

export function isSafeUrl(value: string): boolean {
  if (value === "") return true;
  if (value.length > EXPERIENCE_LIMITS.url) return false;
  if (/[\s"'<>`\\(){}]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch { return false; }
}

function str(s: Strictness, v: unknown, d: string, path: string, max: number): string {
  if (v === undefined) return d;
  if (typeof v !== "string") return s.strict ? s.fail(path, "must be a string") : d;
  if (v.length > max) return s.strict ? s.fail(path, `exceeds ${max} characters`) : d;
  if (UNSAFE_TEXT.test(v)) return s.strict ? s.fail(path, "contains disallowed characters") : d;
  return v;
}
function bi(s: Strictness, v: unknown, d: BiText, path: string, max: number = EXPERIENCE_LIMITS.mediumText): BiText {
  if (v === undefined) return { ...d };
  if (!isObj(v)) return s.strict ? s.fail(path, "must be an {ar,en} object") : { ...d };
  return { ar: str(s, v.ar, d.ar, `${path}.ar`, max), en: str(s, v.en, d.en, `${path}.en`, max) };
}
function bool(s: Strictness, v: unknown, d: boolean, path: string): boolean {
  if (v === undefined) return d;
  if (typeof v !== "boolean") return s.strict ? s.fail(path, "must be boolean") : d;
  return v;
}
function oneOf<T extends string>(s: Strictness, v: unknown, list: readonly T[], d: T, path: string): T {
  if (v === undefined) return d;
  if (typeof v !== "string" || !(list as readonly string[]).includes(v)) return s.strict ? s.fail(path, `must be one of ${list.join(", ")}`) : d;
  return v as T;
}
function num(s: Strictness, v: unknown, d: number, min: number, max: number, path: string, integer = false): number {
  if (v === undefined) return d;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    return s.strict ? s.fail(path, `must be ${integer ? "an integer" : "a number"} between ${min} and ${max}`) : d;
  }
  return v;
}
function color(s: Strictness, v: unknown, d: string, path: string): string {
  if (v === undefined) return d;
  if (typeof v !== "string" || !HEX.test(v)) return s.strict ? s.fail(path, "must be a #rrggbb hex colour") : d;
  return v.toLowerCase();
}
function url(s: Strictness, v: unknown, d: string, path: string): string {
  if (v === undefined) return d;
  if (typeof v !== "string" || !isSafeUrl(v.trim())) return s.strict ? s.fail(path, "must be empty, a site-relative path, or an https:// URL") : d;
  return v.trim();
}
function arr(s: Strictness, v: unknown, path: string, max: number): unknown[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return s.strict ? s.fail(path, "must be an array") : undefined;
  if (v.length > max) return s.strict ? s.fail(path, `may contain at most ${max} items`) : v.slice(0, max);
  return v;
}
function obj(s: Strictness, v: unknown, path: string): Record<string, unknown> {
  if (v === undefined) return {};
  if (!isObj(v)) return s.strict ? s.fail(path, "must be an object") : {};
  return v;
}

/* ------------------------------------------------------------------ parsers */

function parseNavItems(s: Strictness, v: unknown, d: NavItem[], path: string): NavItem[] {
  const list = arr(s, v, path, EXPERIENCE_LIMITS.navItems);
  if (!list) return d.map((i) => ({ ...i, label: { ...i.label } }));
  const out: NavItem[] = [];
  list.forEach((raw, idx) => {
    const p = `${path}[${idx}]`;
    if (!isObj(raw)) { if (s.strict) s.fail(p, "must be an object"); return; }
    const route = oneOf(s, raw.route, LINKABLE_ROUTE_IDS, "home", `${p}.route`);
    if (raw.route === undefined && s.strict) s.fail(`${p}.route`, "is required");
    const fallback = d.find((i) => i.route === route) || nav(route, "", "");
    out.push({
      route,
      label: bi(s, raw.label, fallback.label, `${p}.label`, EXPERIENCE_LIMITS.shortText),
      visible: bool(s, raw.visible, true, `${p}.visible`),
      highlight: bool(s, raw.highlight, false, `${p}.highlight`),
    });
  });
  return out;
}

function parseCards(s: Strictness, v: unknown, d: TextCard[], path: string, max: number): TextCard[] {
  const list = arr(s, v, path, max);
  if (!list) return d.map((c) => ({ title: { ...c.title }, body: { ...c.body } }));
  return list.map((raw, idx) => {
    const p = `${path}[${idx}]`;
    const o = obj(s, raw, p);
    const empty = { title: t("", ""), body: t("", "") };
    return {
      title: bi(s, o.title, (d[idx] || empty).title, `${p}.title`, EXPERIENCE_LIMITS.shortText),
      body: bi(s, o.body, (d[idx] || empty).body, `${p}.body`),
    };
  });
}

function parseBiList(s: Strictness, v: unknown, d: BiText[], path: string, max: number): BiText[] {
  const list = arr(s, v, path, max);
  if (!list) return d.map((item) => ({ ...item }));
  return list.map((raw, idx) => bi(s, raw, d[idx] || t("", ""), `${path}[${idx}]`, EXPERIENCE_LIMITS.shortText));
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;

function parseContent(s: Strictness, v: unknown): ContentSettings {
  const D = DEFAULT_EXPERIENCE_SETTINGS.content;
  const L = EXPERIENCE_LIMITS;
  const SH = L.shortText;
  const c = obj(s, v, "content");
  const ab = obj(s, c.about, "content.about");
  const offersList = arr(s, ab.offers, "content.about.offers", L.offers);
  const fq = obj(s, c.faq, "content.faq");
  const faqList = arr(s, fq.items, "content.faq.items", L.faqItems);
  const sv = obj(s, c.services, "content.services");
  const kn = obj(s, c.knowledge, "content.knowledge");
  const artList = arr(s, kn.articles, "content.knowledge.articles", L.articles);
  const rg = obj(s, c.registration, "content.registration");
  const pa = obj(s, c.participant, "content.participant");
  const ad = obj(s, c.admin, "content.admin");
  const navIn = obj(s, ad.navLabels, "content.admin.navLabels");
  if (s.strict) for (const k of Object.keys(navIn)) if (!(ADMIN_VIEW_IDS as readonly string[]).includes(k)) s.fail(`content.admin.navLabels.${k}`, "unknown admin view");
  const nf = obj(s, c.notFound, "content.notFound");
  const navLabels = {} as Record<AdminViewId, BiText>;
  for (const id of ADMIN_VIEW_IDS) navLabels[id] = bi(s, navIn[id], D.admin.navLabels[id], `content.admin.navLabels.${id}`, 60);
  const empty = t("", "");
  const seenSlugs = new Set<string>();
  const articles: ArticleEntry[] = [];
  (artList || D.knowledge.articles).forEach((raw, i) => {
    const p = `content.knowledge.articles[${i}]`;
    const o = obj(s, raw, p);
    const slug = typeof o.slug === "string" && SLUG.test(o.slug) && o.slug.length <= 80 ? o.slug : "";
    if (!slug) { if (s.strict) s.fail(`${p}.slug`, "must be lowercase letters, digits and dashes (max 80)"); return; }
    if (seenSlugs.has(slug)) { if (s.strict) s.fail(`${p}.slug`, "is duplicated"); return; }
    seenSlugs.add(slug);
    const date = typeof o.date === "string" && DATE.test(o.date) ? o.date : (o.date === undefined ? "" : (s.strict ? s.fail(`${p}.date`, "must be YYYY-MM-DD or empty") : ""));
    articles.push({
      slug, date,
      hidden: bool(s, o.hidden, false, `${p}.hidden`),
      featured: bool(s, o.featured, false, `${p}.featured`),
      category: bi(s, o.category, empty, `${p}.category`, SH),
      title: bi(s, o.title, empty, `${p}.title`, 200),
      excerpt: bi(s, o.excerpt, empty, `${p}.excerpt`, L.mediumText),
      readTime: bi(s, o.readTime, empty, `${p}.readTime`, 40),
      body: bi(s, o.body, empty, `${p}.body`, L.articleBody),
    });
  });
  return {
    about: {
      intro: bi(s, ab.intro, D.about.intro, "content.about.intro", L.longText),
      sectionsTitle: bi(s, ab.sectionsTitle, D.about.sectionsTitle, "content.about.sectionsTitle", SH),
      sections: parseCards(s, ab.sections, D.about.sections, "content.about.sections", L.aboutItems),
      valuesTitle: bi(s, ab.valuesTitle, D.about.valuesTitle, "content.about.valuesTitle", SH),
      values: parseCards(s, ab.values, D.about.values, "content.about.values", L.aboutItems),
      offersTitle: bi(s, ab.offersTitle, D.about.offersTitle, "content.about.offersTitle", SH),
      offers: offersList ? offersList.map((o, i) => bi(s, o, empty, `content.about.offers[${i}]`)) : D.about.offers.map((o) => ({ ...o })),
    },
    faq: {
      items: faqList
        ? faqList.map((raw, i) => { const o = obj(s, raw, `content.faq.items[${i}]`); return { q: bi(s, o.q, empty, `content.faq.items[${i}].q`, 240), a: bi(s, o.a, empty, `content.faq.items[${i}].a`, L.longText) }; })
        : D.faq.items.map((x) => ({ q: { ...x.q }, a: { ...x.a } })),
      contactTitle: bi(s, fq.contactTitle, D.faq.contactTitle, "content.faq.contactTitle", SH),
      contactBody: bi(s, fq.contactBody, D.faq.contactBody, "content.faq.contactBody"),
    },
    services: {
      items: parseCards(s, sv.items, D.services.items, "content.services.items", L.serviceItems),
      requestLabel: bi(s, sv.requestLabel, D.services.requestLabel, "content.services.requestLabel", SH),
      contactTitle: bi(s, sv.contactTitle, D.services.contactTitle, "content.services.contactTitle", SH),
      contactBody: bi(s, sv.contactBody, D.services.contactBody, "content.services.contactBody"),
    },
    knowledge: { intro: bi(s, kn.intro, D.knowledge.intro, "content.knowledge.intro"), articles },
    registration: {
      heading: bi(s, rg.heading, D.registration.heading, "content.registration.heading", SH),
      subheading: bi(s, rg.subheading, D.registration.subheading, "content.registration.subheading"),
      submitLabel: bi(s, rg.submitLabel, D.registration.submitLabel, "content.registration.submitLabel", 60),
      successTitle: bi(s, rg.successTitle, D.registration.successTitle, "content.registration.successTitle", SH),
      successBody: bi(s, rg.successBody, D.registration.successBody, "content.registration.successBody"),
    },
    participant: {
      intro: bi(s, pa.intro, D.participant.intro, "content.participant.intro", L.longText),
      emptyText: bi(s, pa.emptyText, D.participant.emptyText, "content.participant.emptyText"),
    },
    admin: { navLabels, welcome: bi(s, ad.welcome, D.admin.welcome, "content.admin.welcome") },
    notFound: {
      title: bi(s, nf.title, D.notFound.title, "content.notFound.title", SH),
      body: bi(s, nf.body, D.notFound.body, "content.notFound.body"),
      ctaLabel: bi(s, nf.ctaLabel, D.notFound.ctaLabel, "content.notFound.ctaLabel", 60),
    },
  };
}

function parse(input: unknown, strict: boolean): ExperienceSettings {
  const s = new Strictness(strict);
  const D = DEFAULT_EXPERIENCE_SETTINGS;
  if (input === undefined || input === null) return clone(D);
  if (!isObj(input)) return strict ? s.fail("(root)", "must be an object") : clone(D);
  if (strict && input.version !== undefined && input.version !== 1 && input.version !== 2) {
    s.fail("version", "must be 1 or 2");
  }
  const migrateVersion1Showcases = !strict && (input.version === 1 || input.version === undefined);
  if (strict) {
    let size = 0;
    try { size = JSON.stringify(input).length; } catch { s.fail("(root)", "is not serialisable"); }
    if (size > EXPERIENCE_LIMITS.totalJsonBytes) s.fail("(root)", `exceeds ${EXPERIENCE_LIMITS.totalJsonBytes} bytes`);
  }

  const th = obj(s, input.theme, "theme");
  const requestedThemePreset = oneOf(s, th.preset, THEME_PRESETS, D.theme.preset, "theme.preset");
  const matchesPalette = (palette: Pick<ThemeSettings, "primary" | "gold" | "ink" | "background" | "surface">) =>
    th.primary === palette.primary &&
    th.gold === palette.gold &&
    th.ink === palette.ink &&
    th.background === palette.background &&
    th.surface === palette.surface;
  const legacySandstone = THEME_PRESET_VALUES.sandstone;
  const migrateDefaultPalette =
    (requestedThemePreset === "sandstone" && matchesPalette(legacySandstone)) ||
    (requestedThemePreset === "misbar" && matchesPalette(LEGACY_MISBAR_THEME_VALUES));
  const theme: ThemeSettings = {
    preset: migrateDefaultPalette ? "misbar" : requestedThemePreset,
    primary: migrateDefaultPalette ? THEME_PRESET_VALUES.misbar.primary : color(s, th.primary, D.theme.primary, "theme.primary"),
    gold: migrateDefaultPalette ? THEME_PRESET_VALUES.misbar.gold : color(s, th.gold, D.theme.gold, "theme.gold"),
    ink: migrateDefaultPalette ? THEME_PRESET_VALUES.misbar.ink : color(s, th.ink, D.theme.ink, "theme.ink"),
    background: migrateDefaultPalette ? THEME_PRESET_VALUES.misbar.background : color(s, th.background, D.theme.background, "theme.background"),
    surface: migrateDefaultPalette ? THEME_PRESET_VALUES.misbar.surface : color(s, th.surface, D.theme.surface, "theme.surface"),
    headingFont: oneOf(s, th.headingFont, HEADING_FONTS, D.theme.headingFont, "theme.headingFont"),
    bodyFont: oneOf(s, th.bodyFont, BODY_FONTS, D.theme.bodyFont, "theme.bodyFont"),
    baseFontSize: num(s, th.baseFontSize, D.theme.baseFontSize, EXPERIENCE_LIMITS.fontMin, EXPERIENCE_LIMITS.fontMax, "theme.baseFontSize", true),
    headingScale: num(s, th.headingScale, D.theme.headingScale, EXPERIENCE_LIMITS.headingScaleMin, EXPERIENCE_LIMITS.headingScaleMax, "theme.headingScale"),
    radius: oneOf(s, th.radius, RADIUS_SCALES, D.theme.radius, "theme.radius"),
    buttonStyle: oneOf(s, th.buttonStyle, BUTTON_STYLES, D.theme.buttonStyle, "theme.buttonStyle"),
    cardStyle: oneOf(s, th.cardStyle, CARD_STYLES, D.theme.cardStyle, "theme.cardStyle"),
    backgroundPattern: oneOf(s, th.backgroundPattern, BACKGROUND_PATTERNS, D.theme.backgroundPattern, "theme.backgroundPattern"),
    density: oneOf(s, th.density, DENSITIES, D.theme.density, "theme.density"),
    motion: bool(s, th.motion, D.theme.motion, "theme.motion"),
  };

  const n = obj(s, input.navigation, "navigation");
  const navigation: NavigationSettings = {
    items: parseNavItems(s, n.items, D.navigation.items, "navigation.items"),
    showContactButton: bool(s, n.showContactButton, D.navigation.showContactButton, "navigation.showContactButton"),
    showCurrency: bool(s, n.showCurrency, D.navigation.showCurrency, "navigation.showCurrency"),
    showLanguage: bool(s, n.showLanguage, D.navigation.showLanguage, "navigation.showLanguage"),
    showInstall: bool(s, n.showInstall, D.navigation.showInstall, "navigation.showInstall"),
    showTagline: bool(s, n.showTagline, D.navigation.showTagline, "navigation.showTagline"),
    tagline: bi(s, n.tagline, D.navigation.tagline, "navigation.tagline", EXPERIENCE_LIMITS.shortText),
  };

  const f = obj(s, input.footer, "footer");
  const footer: FooterSettings = {
    tagline: bi(s, f.tagline, D.footer.tagline, "footer.tagline"),
    showContact: bool(s, f.showContact, D.footer.showContact, "footer.showContact"),
    showLinks: bool(s, f.showLinks, D.footer.showLinks, "footer.showLinks"),
    linksTitle: bi(s, f.linksTitle, D.footer.linksTitle, "footer.linksTitle", EXPERIENCE_LIMITS.shortText),
    links: parseNavItems(s, f.links, D.footer.links, "footer.links"),
    copyright: bi(s, f.copyright, D.footer.copyright, "footer.copyright", EXPERIENCE_LIMITS.shortText),
    disclaimer: bi(s, f.disclaimer, D.footer.disclaimer, "footer.disclaimer"),
  };

  const h = obj(s, input.home, "home");
  const secList = arr(s, h.sections, "home.sections", HOME_SECTION_IDS.length);
  let sections: HomeSection[] = D.home.sections.map((x) => ({ ...x }));
  if (secList) {
    const seen = new Set<string>();
    const parsed: HomeSection[] = [];
    secList.forEach((raw, idx) => {
      const p = `home.sections[${idx}]`;
      const o = obj(s, raw, p);
      const id = oneOf(s, o.id, HOME_SECTION_IDS, "hero", `${p}.id`);
      if (o.id === undefined) { if (s.strict) s.fail(`${p}.id`, "is required"); return; }
      if (seen.has(id)) { if (s.strict) s.fail(`${p}.id`, "is duplicated"); return; }
      seen.add(id);
      parsed.push({ id, visible: bool(s, o.visible, true, `${p}.visible`) });
    });
    const isLegacyDefaultOrder =
      parsed.length === LEGACY_DEFAULT_HOME_SECTION_ORDER.length &&
      parsed.every((section, index) => section.id === LEGACY_DEFAULT_HOME_SECTION_ORDER[index]);
    if (isLegacyDefaultOrder) {
      parsed.sort((a, b) => HOME_SECTION_IDS.indexOf(a.id) - HOME_SECTION_IDS.indexOf(b.id));
    }
    const rank = new Map<HomeSectionId, number>(HOME_SECTION_IDS.map((id, index) => [id, index]));
    const followsDefaultOrder = parsed.every((section, index) =>
      index === 0 || rank.get(parsed[index - 1].id)! < rank.get(section.id)!,
    );
    const afterSection: Partial<Record<HomeSectionId, HomeSectionId>> = {
      services: "hero",
      journalTicker: "services",
      programs: "journalTicker",
      pathways: "programs",
      process: "pathways",
      affiliations: "process",
      knowledge: "affiliations",
      faqTeaser: "knowledge",
      cta: "faqTeaser",
    };
    HOME_SECTION_IDS.forEach((id) => {
      if (seen.has(id)) return;
      const section: HomeSection = { id, visible: true };
      const pivot = followsDefaultOrder ? afterSection[id] : undefined;
      const pivotIndex = pivot ? parsed.findIndex((item) => item.id === pivot) : -1;
      if (pivotIndex >= 0) parsed.splice(pivotIndex + 1, 0, section);
      else parsed.push(section);
    });
    sections = parsed;
  }
  const hh = obj(s, h.hero, "home.hero");
  const pc = obj(s, hh.primaryCta, "home.hero.primaryCta");
  const sc = obj(s, hh.secondaryCta, "home.hero.secondaryCta");
  const sv = obj(s, h.services, "home.services");
  const pr = obj(s, h.programs, "home.programs");
  const pw = obj(s, h.pathways, "home.pathways");
  const af = obj(s, h.affiliations, "home.affiliations");
  const jt = obj(s, h.journalTicker, "home.journalTicker");
  const ps = obj(s, h.process, "home.process");
  const kn = obj(s, h.knowledge, "home.knowledge");
  const fq = obj(s, h.faqTeaser, "home.faqTeaser");
  const ct = obj(s, h.cta, "home.cta");
  const SH = EXPERIENCE_LIMITS.shortText;
  const home: HomeSettings = {
    sections,
    hero: {
      eyebrow: bi(s, hh.eyebrow, D.home.hero.eyebrow, "home.hero.eyebrow", SH),
      title: bi(s, hh.title, D.home.hero.title, "home.hero.title", SH),
      highlight: bi(s, hh.highlight, D.home.hero.highlight, "home.hero.highlight", SH),
      subtitle: bi(s, hh.subtitle, D.home.hero.subtitle, "home.hero.subtitle"),
      primaryCta: { label: bi(s, pc.label, D.home.hero.primaryCta.label, "home.hero.primaryCta.label", SH), route: oneOf(s, pc.route, LINKABLE_ROUTE_IDS, D.home.hero.primaryCta.route, "home.hero.primaryCta.route") },
      secondaryCta: { label: bi(s, sc.label, D.home.hero.secondaryCta.label, "home.hero.secondaryCta.label", SH), route: oneOf(s, sc.route, LINKABLE_ROUTE_IDS, D.home.hero.secondaryCta.route, "home.hero.secondaryCta.route") },
      imageUrl: url(s, hh.imageUrl, D.home.hero.imageUrl, "home.hero.imageUrl"),
      imageAlt: bi(s, hh.imageAlt, D.home.hero.imageAlt, "home.hero.imageAlt", SH),
    },
    services: {
      title: bi(s, sv.title, D.home.services.title, "home.services.title", SH),
      subtitle: bi(s, sv.subtitle, D.home.services.subtitle, "home.services.subtitle"),
    },
    programs: {
      title: bi(s, pr.title, D.home.programs.title, "home.programs.title", SH),
      subtitle: bi(s, pr.subtitle, D.home.programs.subtitle, "home.programs.subtitle"),
      limit: num(s, pr.limit, D.home.programs.limit, EXPERIENCE_LIMITS.programsMin, EXPERIENCE_LIMITS.programsMax, "home.programs.limit", true),
      emptyText: bi(s, pr.emptyText, D.home.programs.emptyText, "home.programs.emptyText"),
      viewAllLabel: bi(s, pr.viewAllLabel, D.home.programs.viewAllLabel, "home.programs.viewAllLabel", SH),
    },
    pathways: {
      title: bi(s, pw.title, D.home.pathways.title, "home.pathways.title", SH),
      subtitle: bi(s, pw.subtitle, D.home.pathways.subtitle, "home.pathways.subtitle"),
      items: parseCards(s, pw.items, D.home.pathways.items, "home.pathways.items", EXPERIENCE_LIMITS.pathwayItems),
    },
    affiliations: {
      title: bi(
        s,
        migrateVersion1Showcases && (af.title as BiText | undefined)?.ar === "جامعات ودول" ? undefined : af.title,
        D.home.affiliations.title,
        "home.affiliations.title",
        SH,
      ),
      subtitle: bi(
        s,
        migrateVersion1Showcases && (af.subtitle as BiText | undefined)?.ar === "تظهر هنا الجهات التي اعتمدتم إدراجها في إعدادات الموقع." ? undefined : af.subtitle,
        D.home.affiliations.subtitle,
        "home.affiliations.subtitle",
      ),
      countriesTitle: bi(s, af.countriesTitle, D.home.affiliations.countriesTitle, "home.affiliations.countriesTitle", SH),
      universitiesTitle: bi(s, af.universitiesTitle, D.home.affiliations.universitiesTitle, "home.affiliations.universitiesTitle", SH),
      countries: parseBiList(
        s,
        migrateVersion1Showcases && Array.isArray(af.countries) && af.countries.length === 0 ? undefined : af.countries,
        D.home.affiliations.countries,
        "home.affiliations.countries",
        EXPERIENCE_LIMITS.homeAffiliationItems,
      ),
      universities: parseBiList(
        s,
        migrateVersion1Showcases && Array.isArray(af.universities) && af.universities.length === 0 ? undefined : af.universities,
        D.home.affiliations.universities,
        "home.affiliations.universities",
        EXPERIENCE_LIMITS.homeAffiliationItems,
      ),
      animationEnabled: bool(s, af.animationEnabled, D.home.affiliations.animationEnabled, "home.affiliations.animationEnabled"),
      animationDurationSeconds: num(
        s,
        af.animationDurationSeconds,
        D.home.affiliations.animationDurationSeconds,
        EXPERIENCE_LIMITS.marqueeDurationMinSeconds,
        EXPERIENCE_LIMITS.marqueeDurationMaxSeconds,
        "home.affiliations.animationDurationSeconds",
        true,
      ),
    },
    journalTicker: {
      title: bi(s, jt.title, D.home.journalTicker.title, "home.journalTicker.title", SH),
      subtitle: bi(s, jt.subtitle, D.home.journalTicker.subtitle, "home.journalTicker.subtitle"),
      animationEnabled: bool(s, jt.animationEnabled, D.home.journalTicker.animationEnabled, "home.journalTicker.animationEnabled"),
      animationDurationSeconds: num(
        s,
        jt.animationDurationSeconds,
        D.home.journalTicker.animationDurationSeconds,
        EXPERIENCE_LIMITS.marqueeDurationMinSeconds,
        EXPERIENCE_LIMITS.marqueeDurationMaxSeconds,
        "home.journalTicker.animationDurationSeconds",
        true,
      ),
    },
    process: {
      title: bi(s, ps.title, D.home.process.title, "home.process.title", SH),
      steps: parseCards(s, ps.steps, D.home.process.steps, "home.process.steps", EXPERIENCE_LIMITS.processSteps),
    },
    knowledge: {
      title: bi(s, kn.title, D.home.knowledge.title, "home.knowledge.title", SH),
      body: bi(s, kn.body, D.home.knowledge.body, "home.knowledge.body"),
      ctaLabel: bi(s, kn.ctaLabel, D.home.knowledge.ctaLabel, "home.knowledge.ctaLabel", SH),
    },
    faqTeaser: {
      title: bi(s, fq.title, D.home.faqTeaser.title, "home.faqTeaser.title", SH),
      body: bi(s, fq.body, D.home.faqTeaser.body, "home.faqTeaser.body"),
      ctaLabel: bi(s, fq.ctaLabel, D.home.faqTeaser.ctaLabel, "home.faqTeaser.ctaLabel", SH),
    },
    cta: {
      title: bi(s, ct.title, D.home.cta.title, "home.cta.title", SH),
      body: bi(s, ct.body, D.home.cta.body, "home.cta.body"),
      label: bi(s, ct.label, D.home.cta.label, "home.cta.label", SH),
      route: oneOf(s, ct.route, LINKABLE_ROUTE_IDS, D.home.cta.route, "home.cta.route"),
    },
  };

  const pcIn = obj(s, input.pageChrome, "pageChrome");
  const seoIn = obj(s, input.seo, "seo");
  if (strict) {
    for (const k of Object.keys(pcIn)) if (!(ROUTE_IDS as readonly string[]).includes(k)) s.fail(`pageChrome.${k}`, "unknown route");
    for (const k of Object.keys(seoIn)) if (!(ROUTE_IDS as readonly string[]).includes(k)) s.fail(`seo.${k}`, "unknown route");
  }
  const pageChrome = {} as Record<RouteId, PageChrome>;
  const seoOut = {} as Record<RouteId, SeoEntry>;
  for (const id of ROUTE_IDS) {
    const c = obj(s, pcIn[id], `pageChrome.${id}`);
    pageChrome[id] = {
      eyebrow: bi(s, c.eyebrow, D.pageChrome[id].eyebrow, `pageChrome.${id}.eyebrow`, SH),
      showEyebrow: bool(s, c.showEyebrow, D.pageChrome[id].showEyebrow, `pageChrome.${id}.showEyebrow`),
    };
    const e = obj(s, seoIn[id], `seo.${id}`);
    const forcedPrivate = PRIVATE_ROUTE_IDS.includes(id) || id === "notFound";
    seoOut[id] = {
      title: bi(s, e.title, D.seo[id].title, `seo.${id}.title`, 160),
      description: bi(s, e.description, D.seo[id].description, `seo.${id}.description`, 320),
      imageUrl: url(s, e.imageUrl, D.seo[id].imageUrl, `seo.${id}.imageUrl`),
      noIndex: forcedPrivate ? true : bool(s, e.noIndex, D.seo[id].noIndex, `seo.${id}.noIndex`),
    };
  }

  const a = obj(s, input.announcement, "announcement");
  const routesList = arr(s, a.routes, "announcement.routes", ROUTE_IDS.length);
  const announcement: AnnouncementSettings = {
    enabled: bool(s, a.enabled, D.announcement.enabled, "announcement.enabled"),
    text: bi(s, a.text, D.announcement.text, "announcement.text", 240),
    linkLabel: bi(s, a.linkLabel, D.announcement.linkLabel, "announcement.linkLabel", SH),
    linkRoute: oneOf(s, a.linkRoute, ["", ...LINKABLE_ROUTE_IDS] as const, D.announcement.linkRoute, "announcement.linkRoute"),
    tone: oneOf(s, a.tone, ANNOUNCEMENT_TONES, D.announcement.tone, "announcement.tone"),
    routes: routesList
      ? Array.from(new Set(routesList.map((r, i) => oneOf(s, r, ROUTE_IDS, "home", `announcement.routes[${i}]`))))
      : [...D.announcement.routes],
  };

  return { version: 2, theme, navigation, footer, home, pageChrome, seo: seoOut, announcement, content: parseContent(s, input.content) };
}

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

/** Lenient: never throws, falls back to defaults for anything missing or invalid. Use on read. */
export function sanitizeExperienceSettings(input: unknown): ExperienceSettings {
  try { return parse(input, false); } catch { return clone(DEFAULT_EXPERIENCE_SETTINGS); }
}

/** Strict: absent values accepted (defaults), supplied invalid values throw a descriptive Error. Use on PUT. */
export function validateExperienceSettings(input: unknown): ExperienceSettings {
  return parse(input, true);
}

/** Non-throwing variant for UIs. */
export function checkExperienceSettings(input: unknown): { ok: true; value: ExperienceSettings } | { ok: false; error: string } {
  try { return { ok: true, value: parse(input, true) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ------------------------------------------------------------------ helpers */

export function resolveRouteId(pathname: string): RouteId {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return "home";
  if (p === "/participant-portal") return "participant";
  if (p === "/coordinator" || p === "/coordinator-portal") return "coordinator";
  if (p === "/special-requests") return "specialRequests";
  if (p === "/knowledge-center") return "knowledge";
  if (p.startsWith("/knowledge-center/")) return "knowledgeArticle";
  if (p === "/about") return "about";
  if (p === "/faq") return "faq";
  if (p.startsWith("/research/")) return "researchDetail";
  if (p === "/survey") return "survey";
  if (p === "/register") return "register";
  if (p === "/admin") return "admin";
  if (p === "/admin/submissions") return "adminSubmissions";
  if (p === "/coordinator/dashboard") return "coordinatorDashboard";
  if (p === "/coordinator/submissions") return "coordinatorSubmissions";
  if (p === "/owner-admin") return "ownerAdmin";
  if (p === "/sign-in" || p.startsWith("/sign-in/")) return "signIn";
  if (p === "/sign-up" || p.startsWith("/sign-up/")) return "signUp";
  return "notFound";
}

export const ROUTE_LABELS: Record<RouteId, { ar: string; path: string }> = {
  home: { ar: "الرئيسية", path: "/" },
  participant: { ar: "بوابة المشارك (الفرص)", path: "/participant-portal" },
  coordinator: { ar: "دخول المنسق", path: "/coordinator, /coordinator-portal" },
  specialRequests: { ar: "الخدمات", path: "/special-requests" },
  knowledge: { ar: "مركز المعرفة", path: "/knowledge-center" },
  knowledgeArticle: { ar: "مقال معرفي", path: "/knowledge-center/:slug" },
  about: { ar: "عن المنصة", path: "/about" },
  faq: { ar: "الأسئلة الشائعة", path: "/faq" },
  researchDetail: { ar: "تفاصيل الفرصة", path: "/research/:id" },
  survey: { ar: "استبيان التسجيل", path: "/survey" },
  register: { ar: "التسجيل", path: "/register" },
  admin: { ar: "لوحة الإدارة", path: "/admin" },
  adminSubmissions: { ar: "سجلات الإدارة", path: "/admin/submissions" },
  coordinatorDashboard: { ar: "لوحة المنسق", path: "/coordinator/dashboard" },
  coordinatorSubmissions: { ar: "سجلات المنسق", path: "/coordinator/submissions" },
  ownerAdmin: { ar: "دخول المالك", path: "/owner-admin" },
  signIn: { ar: "تسجيل الدخول", path: "/sign-in" },
  signUp: { ar: "إنشاء حساب", path: "/sign-up" },
  notFound: { ar: "صفحة غير موجودة", path: "*" },
};

/** Fill {title}/{description} placeholders in SEO templates. */
export function fillSeoTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "").replace(/\s+\|\s+\|/g, " |").trim();
}

/** Parses an article body (plain text) into renderable blocks. No HTML is ever produced. */
export type ArticleBlock = { kind: "heading"; text: string } | { kind: "paragraph"; text: string } | { kind: "bullets"; items: string[] };
export function parseArticleBody(body: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  for (const chunk of body.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let para: string[] = [];
    let bullets: string[] = [];
    const flush = () => {
      if (para.length) { blocks.push({ kind: "paragraph", text: para.join(" ") }); para = []; }
      if (bullets.length) { blocks.push({ kind: "bullets", items: bullets }); bullets = []; }
    };
    for (const line of lines) {
      if (line.startsWith("## ")) { flush(); blocks.push({ kind: "heading", text: line.slice(3) }); }
      else if (line.startsWith("- ")) { if (para.length) { blocks.push({ kind: "paragraph", text: para.join(" ") }); para = []; } bullets.push(line.slice(2)); }
      else { if (bullets.length) { blocks.push({ kind: "bullets", items: bullets }); bullets = []; } para.push(line); }
    }
    flush();
  }
  return blocks;
}
