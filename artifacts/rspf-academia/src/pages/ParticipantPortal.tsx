import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronUp, Lock, Flame, ChevronLeft, ChevronRight, MessageCircle, ExternalLink, Send, Phone, LayoutGrid, SlidersHorizontal, Copy, Mail, Check, Search, X, CalendarDays, MapPin } from "lucide-react";
import { Link } from "wouter";
import { ResearchOpportunity } from "@/lib/researchData";
import RegistrationModal from "@/components/RegistrationModal";
import SiteAnnouncement from "@/components/SiteAnnouncement";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";
import { getContactUsHref, buildOpportunityInquiryLinks } from "@/lib/siteContentSettings";
import OpportunityMedia from "@/components/OpportunityMedia";
import { OpportunityFeeSummary } from "@/components/OpportunityPrice";
import { OpportunityCurrency, useCurrency } from "@/lib/opportunityPricing";
import { useLanguage } from "@/lib/i18n";
import { buildSpecialtyOptions, canonicalSpecialty, specialtyMatches } from "@/components/SpecialtyFilter";
import { ProtectedResearchWatermark, AntiCaptureResearchTitle } from "@/components/ResearchProtection";
import { getEnglishOpportunityTitle, getOpportunityShareText } from "@/lib/opportunityDisplay";
import { isFieldVisible } from "@/lib/opportunityVisibility";
import { apiFetch } from "@/lib/api";
import { filterOpportunities, uniqueResearchOpportunities, type OpportunityFeeFilter, type OpportunityPriceSort } from "@/lib/opportunityFilters";
import { localizeOpportunityCountry } from "@/lib/opportunityCountries";

export default function ParticipantPortal() {
  const { direction, language, localize, t } = useLanguage();
  const [expandedCards, setExpandedCards] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedOppId, setCopiedOppId] = useState<number | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<number | null>(null);

  const handleCopyOppLink = async (opportunity: ResearchOpportunity) => {
    const oppId = opportunity.id;
    const text = getOpportunityShareText(opportunity, window.location.origin, language);
    setCopyErrorId(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        try {
          input.select();
          if (!document.execCommand("copy")) throw new Error("Copy unavailable");
        } finally {
          input.remove();
        }
      }
      setCopiedOppId(oppId);
      setTimeout(() => setCopiedOppId(null), 2500);
    } catch {
      setCopiedOppId(null);
      setCopyErrorId(oppId);
    }
  };
  const [selectedResearch, setSelectedResearch] = useState<ResearchOpportunity | null>(null);
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const { currency, setCurrency } = useCurrency();
  const { data: contentSettings } = useSiteContentSettings();
  const showOpportunityDetails = contentSettings.showOpportunityDetails !== false;
  const filterVisibility = contentSettings.opportunityFilterVisibility;
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [feeFilter, setFeeFilter] = useState<OpportunityFeeFilter>("all");
  const [priceSort, setPriceSort] = useState<OpportunityPriceSort>("none");
  const [minimumSeats, setMinimumSeats] = useState<number | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [deadlineWithinDays, setDeadlineWithinDays] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<"grid" | "scroll">(contentSettings.opportunityDisplayMode || "grid");
  const adminDisplayMode = contentSettings.opportunityDisplayMode;
  useEffect(() => {
    if (adminDisplayMode) setDisplayMode(adminDisplayMode);
  }, [adminDisplayMode]);

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const requestInFlight = useRef(false);
  const hasLoadedOpportunities = useRef(false);

  const refreshOpportunities = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (!hasLoadedOpportunities.current) setLoadState("loading");
    try {
      const response = await apiFetch("/api/programs", { cache: "no-store" });
      if (!response.ok) throw new Error("programs unavailable");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected opportunities response");
      const available = (data as ResearchOpportunity[])
        .filter((item) => item.status === "open" && (item.category || "active") === "active");
      setOpportunities(uniqueResearchOpportunities(available));
      hasLoadedOpportunities.current = true;
      setLoadState("ready");
    } catch {
      if (!hasLoadedOpportunities.current) setLoadState("error");
    } finally {
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshOpportunities();
    const refreshWhenVisible = () => { if (!document.hidden) void refreshOpportunities(); };
    window.addEventListener("focus", refreshWhenVisible);
    const timer = window.setInterval(refreshWhenVisible, 10000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshOpportunities]);

  const toggleExpand = (id: number) => {
    setExpandedCards((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const openModal = (research: ResearchOpportunity) => { setSelectedResearch(research); setModalOpen(true); };
  const displayTitle = (opportunity: ResearchOpportunity) => isFieldVisible(opportunity, "title")
    ? getEnglishOpportunityTitle(opportunity)
    : localize("فرصة بحثية — العنوان مخفي", "Research opportunity — title hidden");
  const participantTitle = language === "en" ? contentSettings.pages.participant.titleEn : contentSettings.pages.participant.titleAr;
  const participantDescription = language === "en" ? contentSettings.pages.participant.descriptionEn : contentSettings.pages.participant.descriptionAr;
  const contactHref = getContactUsHref(contentSettings.brand);

  const visibleSpecialtyOpportunities = showOpportunityDetails ? opportunities.filter((opportunity) => isFieldVisible(opportunity, "specialty")) : [];
  const specialtyOptions = buildSpecialtyOptions([], visibleSpecialtyOpportunities);
  const displaySpecialty = (opportunity: ResearchOpportunity) => {
    const canonical = canonicalSpecialty(opportunity.specialtyAr || opportunity.specialty, opportunity.specialtyEn || opportunity.specialty);
    return specialtyOptions.find((option) => option.id === canonical.id) || canonical;
  };
  const hasVisibleSpecialties = showOpportunityDetails && opportunities.some((opportunity) =>
    isFieldVisible(opportunity, "specialty") && Boolean(opportunity.specialtyAr?.trim() || opportunity.specialtyEn?.trim() || opportunity.specialty?.trim()));
  const filteredOpportunities = filterOpportunities(opportunities, {
    query: filterVisibility.searchBySpecialty && showOpportunityDetails ? opportunitySearch : "",
    queryField: "specialty",
    fee: filterVisibility.price ? feeFilter : "all",
    minimumSeats: filterVisibility.seats && showOpportunityDetails ? minimumSeats : null,
    country: filterVisibility.country && showOpportunityDetails ? countryFilter : null,
    deadlineWithinDays: filterVisibility.deadline && showOpportunityDetails ? deadlineWithinDays : null,
    priceSort: filterVisibility.price ? priceSort : "none",
    includeDetails: showOpportunityDetails,
  });
  const hasActiveFilters = Boolean(
    (filterVisibility.searchBySpecialty && showOpportunityDetails && opportunitySearch.trim()) ||
    (filterVisibility.price && feeFilter !== "all") ||
    (filterVisibility.price && priceSort !== "none") ||
    (filterVisibility.seats && minimumSeats !== null) ||
    (filterVisibility.country && showOpportunityDetails && countryFilter) ||
    (filterVisibility.deadline && showOpportunityDetails && deadlineWithinDays !== null)
  );
  const hasVisiblePrices = filterVisibility.price && opportunities.some((opportunity) => isFieldVisible(opportunity, "price"));
  const hasVisibleSeatCounts = filterVisibility.seats && showOpportunityDetails && opportunities.some((opportunity) => isFieldVisible(opportunity, "seats"));
  const countryOptions = filterVisibility.country && showOpportunityDetails ? [...new Set(opportunities
    .filter((opportunity) => isFieldVisible(opportunity, "country"))
    .map((opportunity) => opportunity.country?.trim() || "")
    .filter(Boolean))].sort((a, b) => a.localeCompare(b)) : [];
  const hasVisibleDeadlines = filterVisibility.deadline && showOpportunityDetails && opportunities.some((opportunity) => isFieldVisible(opportunity, "deadline") && Boolean(opportunity.applicationDeadline));
  const resetFilters = () => {
    setOpportunitySearch("");
    setFeeFilter("all");
    setPriceSort("none");
    setMinimumSeats(null);
    setCountryFilter(null);
    setDeadlineWithinDays(null);
  };
  const groupedOpportunities = specialtyOptions
    .map((option) => {
      const specialty = option.nameEn || option.nameAr;
      return {
        id: option.id,
        label: localize(option.nameAr, option.nameEn),
        items: filteredOpportunities.filter((opportunity) => specialtyMatches(opportunity, specialty)),
      };
    })
    .filter((group) => group.items.length > 0);
  const groupedOpportunityIds = new Set(groupedOpportunities.flatMap((group) => group.items.map((opportunity) => opportunity.id)));
  const ungroupedOpportunities = filteredOpportunities.filter((opportunity) => !groupedOpportunityIds.has(opportunity.id));
  if (ungroupedOpportunities.length > 0) {
    groupedOpportunities.push({
      id: "other-specialties",
      label: hasVisibleSpecialties ? localize("تخصصات أخرى", "Other specialties") : localize("فرص بحثية متاحة", "Available research opportunities"),
      items: ungroupedOpportunities,
    });
  }
  const opportunityOrder = (opportunity: ResearchOpportunity) => opportunity.displayOrder ?? Number.MAX_SAFE_INTEGER;
  groupedOpportunities.forEach((group) => {
    group.items.sort((a, b) => opportunityOrder(a) - opportunityOrder(b) || (a.titleEn || a.title).localeCompare(b.titleEn || b.title));
  });
  groupedOpportunities.sort((a, b) => {
    const orderA = Math.min(...a.items.map(opportunityOrder));
    const orderB = Math.min(...b.items.map(opportunityOrder));
    return orderA - orderB || a.label.localeCompare(b.label);
  });
  const isSpecialtyScroll = displayMode === "scroll";
  const contentFlow = direction === "rtl" ? "flex-row-reverse" : "flex-row";

  return (
      <div className="min-h-screen bg-white w-full max-w-full overflow-x-clip" dir={direction}>
      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white py-12 px-4 sm:py-16">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-black text-[#117b59] mb-4 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#117b59]" />
            <span>{participantTitle}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            {participantTitle}
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            {participantDescription}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
            <a href={contactHref.href} target={contactHref.isExternal ? "_blank" : undefined} rel={contactHref.isExternal ? "noopener noreferrer" : undefined} data-testid="button-portal-welcome-contact" className="inline-flex items-center gap-2 rounded-xl bg-[#0C3156] px-4 py-2 text-white transition-colors hover:bg-[#0a2847]">
              <MessageCircle size={14} />
              <span>{language === "ar" ? (contentSettings.brand.contactUsLabelAr || "تواصل معنا") : (contentSettings.brand.contactUsLabelEn || "Contact us")}</span>
            </a>
            <Link href="/knowledge-center" className="text-[#117b59] hover:underline">{localize("مركز المعرفة", "Knowledge Center")}</Link>
          </div>

        </div>
      </section>


      <section className="py-8 sm:py-10 px-3 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
              <div className="mb-5">
                <SiteAnnouncement content={localize(contentSettings.pages.participant.contentAr, contentSettings.pages.participant.contentEn)} />
              </div>

              <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${contentFlow}`}>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{localize("الفرص البحثية المتاحة للتسجيل", "Research opportunities open for registration")}</h2>
                  <p className="text-xs text-slate-500 mt-1">{localize("تصفح البرامج والفرص وسجل مقعدك مباشرة أو استفسر عبر القنوات المباشرة", "Browse programs, reserve your seat directly or inquire via direct channels")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-[#0C3156]/8 text-[#0C3156] text-xs font-bold px-3 py-1.5 rounded-full border border-[#0C3156]/12">
                      {localize(`${filteredOpportunities.length} فرصة متاحة`, `${filteredOpportunities.length} opportunities available`)}
                  </span>
                  {/* View Mode Toggle: Grid or Carousel */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDisplayMode("grid")}
                      data-testid="button-view-grid"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        displayMode === "grid"
                          ? "bg-white text-[#0C3156] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title={localize("عرض شبكة", "Grid view")}
                    >
                      <LayoutGrid size={14} />
                      <span>{localize("شبكة", "Grid")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayMode("scroll")}
                      data-testid="button-view-carousel"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        displayMode === "scroll"
                          ? "bg-white text-[#0C3156] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title={localize("عرض كروسال (تمرير أفقي)", "Carousel view")}
                    >
                      <SlidersHorizontal size={14} />
                      <span>{localize("كروسال", "Carousel")}</span>
                    </button>
                  </div>
                </div>
              </div>
              {Object.values(filterVisibility).some(Boolean) && <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="section-opportunity-search" aria-label={localize("البحث والفرز في الفرص", "Opportunity search and filters")}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {filterVisibility.searchBySpecialty && <label className="relative md:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("بحث حسب التخصص", "Search by specialty")}</span>
                    <Search size={16} className="pointer-events-none absolute start-3 top-[2.45rem] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      type="search"
                      value={opportunitySearch}
                      onChange={(event) => setOpportunitySearch(event.target.value)}
                      data-testid="input-opportunity-search"
                      disabled={!showOpportunityDetails || !hasVisibleSpecialties}
                      placeholder={localize("اكتب اسم التخصص", "Enter a specialty")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-10 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15"
                    />
                  </label>}
                  {filterVisibility.country && (
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("بلد الفرصة", "Opportunity country")}</span>
                      <select
                        value={showOpportunityDetails ? countryFilter || "" : ""}
                        onChange={(event) => setCountryFilter(event.target.value || null)}
                        disabled={!showOpportunityDetails || countryOptions.length === 0}
                        data-testid="select-opportunity-country-filter"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{localize("كل البلدان", "All countries")}</option>
                        {countryOptions.length === 0 && <option value="" disabled>{localize("لا توجد بلدان مسجلة للفرص", "No opportunity countries are available")}</option>}
                        {countryOptions.map((country) => <option key={country} value={country}>{localizeOpportunityCountry(country, language)}</option>)}
                      </select>
                    </label>
                  )}
                  {filterVisibility.seats && hasVisibleSeatCounts && (
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("المقاعد المتاحة على الأقل", "Minimum available seats")}</span>
                      <select
                        value={minimumSeats ?? ""}
                        onChange={(event) => setMinimumSeats(event.target.value ? Number(event.target.value) : null)}
                        data-testid="select-opportunity-seats"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15"
                      >
                        <option value="">{localize("أي عدد", "Any number")}</option>
                        <option value="1">{localize("مقعد واحد فأكثر", "1 or more")}</option>
                        <option value="3">{localize("3 مقاعد فأكثر", "3 or more")}</option>
                        <option value="5">{localize("5 مقاعد فأكثر", "5 or more")}</option>
                      </select>
                    </label>
                  )}
                  {filterVisibility.deadline && <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("موعد الإغلاق", "Closing date")}</span>
                    <select
                      value={showOpportunityDetails ? deadlineWithinDays ?? "" : ""}
                      onChange={(event) => setDeadlineWithinDays(event.target.value ? Number(event.target.value) : null)}
                      disabled={!showOpportunityDetails || !hasVisibleDeadlines}
                      data-testid="select-opportunity-deadline-filter"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">{localize("أي موعد", "Any date")}</option>
                      {!hasVisibleDeadlines && <option value="" disabled>{localize("لم تُحدد مواعيد بعد", "No deadlines added yet")}</option>}
                      <option value="7">{localize("خلال 7 أيام", "Within 7 days")}</option>
                      <option value="30">{localize("خلال 30 يوماً", "Within 30 days")}</option>
                      <option value="90">{localize("خلال 90 يوماً", "Within 90 days")}</option>
                    </select>
                  </label>}
                  {filterVisibility.price && hasVisiblePrices && <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("الرسوم", "Fees")}</span>
                    <select
                      value={feeFilter}
                      onChange={(event) => setFeeFilter(event.target.value as OpportunityFeeFilter)}
                      data-testid="select-opportunity-fee"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15"
                    >
                      <option value="all">{localize("كل الرسوم", "Any fees")}</option>
                      <option value="free">{localize("مجانية", "Free")}</option>
                      <option value="paid">{localize("مدفوعة", "Paid")}</option>
                    </select>
                  </label>}
                  {filterVisibility.price && hasVisiblePrices && <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">{localize("ترتيب السعر", "Price order")}</span>
                    <select
                      value={priceSort}
                      onChange={(event) => setPriceSort(event.target.value as OpportunityPriceSort)}
                      data-testid="select-opportunity-price-sort"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#117b59] focus:bg-white focus:ring-2 focus:ring-[#117b59]/15"
                    >
                      <option value="none">{localize("الترتيب الافتراضي", "Default order")}</option>
                      <option value="asc">{localize("الأقل سعرًا أولًا", "Lowest price first")}</option>
                      <option value="desc">{localize("الأعلى سعرًا أولًا", "Highest price first")}</option>
                    </select>
                  </label>}
                  {hasActiveFilters && (
                    <button type="button" onClick={resetFilters} data-testid="button-reset-opportunity-filters" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                      <X size={15} />{localize("مسح الفلاتر", "Clear filters")}
                    </button>
                  )}
                </div>
                {(hasActiveFilters || (filterVisibility.searchBySpecialty && showOpportunityDetails && opportunitySearch)) && <p className="mt-2 text-xs text-slate-500">{localize("تُطبق الفلاتر فقط على المعلومات التي أتاح مالك الفرصة ظهورها.", "Filters only use information made public by the opportunity owner.")}</p>}
                {filterVisibility.searchBySpecialty && showOpportunityDetails && !hasVisibleSpecialties && <p className="mt-2 text-xs text-amber-700" role="status">{localize("الفرص موجودة، لكن التخصص مخفي حاليًا. فعّل إظهار التخصص من إعدادات الفرصة ليعمل البحث به.", "Opportunities are available, but their specialties are hidden. Enable specialty visibility in the opportunity settings to search by specialty.")}</p>}
                {filterVisibility.country && showOpportunityDetails && countryOptions.length === 0 && <p className="mt-2 text-xs text-slate-500">{localize("سيظهر فلتر البلد بعد أن يحدد المالك بلداً للفرص.", "The country filter becomes available when the owner assigns countries to opportunities.")}</p>}
                {filterVisibility.deadline && showOpportunityDetails && !hasVisibleDeadlines && <p className="mt-2 text-xs text-slate-500">{localize("سيظهر فلتر الموعد بعد أن يحدد المالك موعد إغلاق لفرصة واحدة على الأقل.", "The deadline filter becomes available when the owner adds a closing date to an opportunity.")}</p>}
              </section>}
              {loadState === "loading" && opportunities.length === 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" data-testid="portal-loading">
                  {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none" />)}
                </div>
              ) : loadState === "error" && opportunities.length === 0 ? (
                <div role="alert" data-testid="portal-error" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <p className="font-bold text-slate-800">{localize("تعذر تحميل الفرص البحثية حالياً.", "We could not load research opportunities.")}</p>
                  <button type="button" onClick={refreshOpportunities} data-testid="button-portal-retry" className="mt-4 rounded-xl bg-[#0C3156] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0a2847]">{localize("إعادة المحاولة", "Retry")}</button>
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="font-medium">{hasActiveFilters ? localize("لا توجد فرص تطابق معايير البحث الحالية.", "No opportunities match these search filters.") : localize("لا توجد فرص متاحة حالياً", "There are currently no opportunities available.")}</p>
                  <p className="text-sm mt-1">{hasActiveFilters ? localize("جرّب تعديل الفلاتر أو مسحها.", "Try changing or clearing the filters.") : localize("تواصل معنا ليصلك إشعار عند فتح دراسة جديدة.", "Contact us to be notified when a new study opens.")}</p>
                  {hasActiveFilters && <button type="button" onClick={resetFilters} className="mt-3 rounded-xl bg-[#0C3156] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a2847]">{localize("مسح الفلاتر", "Clear filters")}</button>}
                </div>
              ) : (
                <div className="space-y-10">
                   {groupedOpportunities.map((group) => (
                    <section key={group.id} className="srma-reveal" data-testid={`specialty-section-${group.id}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-[#117b59]">
                            {group.label} ({group.items.length})
                          </h3>
                        </div>
                        <div className="h-px flex-1 bg-slate-200 hidden sm:block" />
                        {isSpecialtyScroll && group.items.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`carousel-${group.id}`);
                                if (el) el.scrollBy({ left: direction === "rtl" ? 360 : -360, behavior: "smooth" });
                              }}
                              className="h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0C3156] flex items-center justify-center transition-colors shadow-2xs"
                              title={localize("السابق", "Previous")}
                            >
                              {direction === "rtl" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`carousel-${group.id}`);
                                if (el) el.scrollBy({ left: direction === "rtl" ? -360 : 360, behavior: "smooth" });
                              }}
                              className="h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0C3156] flex items-center justify-center transition-colors shadow-2xs"
                              title={localize("التالي", "Next")}
                            >
                              {direction === "rtl" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                        )}
                      </div>
                      <div
                        id={`carousel-${group.id}`}
                        className={
                          isSpecialtyScroll
                            ? "flex snap-x snap-mandatory gap-5 w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden pb-4 scroll-smooth"
                            : "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                        }
                      >
                   {group.items.map((opp) => {
                    const isExpanded = expandedCards.includes(opp.id);
                    const seatsUsed = opp.totalSeats - opp.seatsLeft;
                    const pct = Math.round((seatsUsed / opp.totalSeats) * 100);
                    return (
                      <div
                        key={opp.id}
                        data-protected="research"
                        className={`protected-research-content research-card relative overflow-hidden select-none ${isSpecialtyScroll ? "w-[min(88vw,390px)] shrink-0 snap-start" : ""} rounded-2xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md`}
                        style={{
                          backgroundColor: "var(--m-surface)",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        data-testid={`card-research-${opp.id}`}
                      >
                        {/* Dynamic Anti-Camera Watermark */}
                        <ProtectedResearchWatermark />

                         {contentSettings.showOpportunityDetails !== false && <div className={`flex items-center justify-between gap-3 mb-3 relative z-10 ${contentFlow}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {contentSettings.visibleParticipantCardParts.includes("specialty") && isFieldVisible(opp, "specialty") && <span className={`text-xs font-bold px-3 py-1 rounded-full ${opp.specialtyColor}`}>{localize(displaySpecialty(opp).nameAr, displaySpecialty(opp).nameEn, opp.specialty)}</span>}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Lock size={10} className="text-emerald-600" />
                              <span>{localize("محمي", "Protected")}</span>
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                            <Flame size={11} /> {localize("مقاعد محدودة متبقية", "Limited seats remaining")}
                          </span>
                         </div>}

                        <div className="relative z-10 mb-2">
                          {isFieldVisible(opp, "title") ? (
                          <AntiCaptureResearchTitle
                            title={displayTitle(opp)}
                            titleHref={`/research/${opp.id}`}
                            titleClassName="mb-1 cursor-pointer text-left font-bold leading-snug text-slate-900 transition-colors select-none text-base"
                          />
                          ) : (
                            <p className="mb-2 text-left text-sm font-bold leading-snug text-slate-700" dir="ltr">{displayTitle(opp)}</p>
                          )}
                        </div>
                        {isFieldVisible(opp, "price") && <div className="mb-4"><OpportunityFeeSummary originalSar={opp.priceOriginalSar} discountedSar={opp.priceDiscountedSar} includedServices={opp.includedServices} currency={currency} onCurrencyChange={setCurrency} compact /></div>}
                         {contentSettings.showOpportunityDetails !== false && <>
                         <div className="mb-4"><OpportunityMedia research={opp} className="aspect-[4/3] min-h-[172px]" /></div>
                         {(isFieldVisible(opp, "country") && opp.country || isFieldVisible(opp, "deadline") && opp.applicationDeadline) && (
                           <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                             {isFieldVisible(opp, "country") && opp.country && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5"><MapPin size={13} />{localizeOpportunityCountry(opp.country, language)}</span>}
                             {isFieldVisible(opp, "deadline") && opp.applicationDeadline && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5"><CalendarDays size={13} />{localize("آخر موعد:", "Deadline:")} {formatOpportunityDeadline(opp.applicationDeadline, language)}</span>}
                           </div>
                         )}

                        <div className="mb-4 space-y-2 text-start text-sm leading-6 text-slate-600">
                          {contentSettings.participantCardOrder.filter((part) => contentSettings.visibleParticipantCardParts.includes(part) && !["specialty", "seats", "benefits"].includes(part)).map((part) => {
                            if (part === "description") return <p key={part}>{localize(opp.descriptionAr, opp.descriptionEn, opp.description)}</p>;
                            if (part === "duration" && opp.duration) return <p key={part}><strong>{localize("المدة:", "Duration:")}</strong> {opp.duration}</p>;
                            if (part === "supervisor" && opp.supervisor) return <p key={part}><strong>{localize("المشرف:", "Supervisor:")}</strong> {opp.supervisor}</p>;
                            if (part === "journal" && opp.journalTarget) return <div key={part} className="space-y-1"><p><strong>{localize("المجلة المستهدفة:", "Target journal:")}</strong> {opp.journalTarget}</p>{opp.journalIssn && <p className="text-xs"><strong>ISSN:</strong> {opp.journalIssn}</p>}</div>;
                            return null;
                   })}
                       </div>

                        {contentSettings.visibleParticipantCardParts.includes("seats") && <><div className="mb-1">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(to left, var(--m-primary), var(--m-gold))" }} />
                          </div>
                        </div>
                        <p className="mb-2 text-start text-xs text-slate-500">{localize(`تبقى ${opp.seatsLeft} مقاعد فقط من أصل ${opp.totalSeats}`, `Only ${opp.seatsLeft} seats remain out of ${opp.totalSeats}`)}</p>
                        <div className="mb-4 flex flex-wrap justify-start gap-1.5 text-[11px] font-bold">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{localize("الكاتب الأول", "First author")}: {opp.firstAuthorSeatsLeft ?? 1} {localize("متاح", "available")}</span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{localize("مؤلف مشارك", "Co-author")}: {opp.coAuthorSeatsLeft ?? 14} {localize("متاح", "available")}</span>
                        </div></>}

                        {contentSettings.visibleParticipantCardParts.includes("benefits") && <><button data-testid={`button-expand-benefits-${opp.id}`} onClick={() => toggleExpand(opp.id)}
                          className={`mb-3 flex w-full items-center justify-start gap-2 text-sm font-semibold text-slate-600 hover:text-[#0C3156] ${contentFlow}`}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {localize("مزايا وقيمة المشاركة", "Benefits and participation value")}
                        </button>
                        {isExpanded && opp.benefits.length > 0 && (
                          <ul className="space-y-1.5 mb-4 bg-[#EFF6FF] rounded-xl p-4">
                            {opp.benefits.map((b) => (
                              <li key={b} className={`flex items-center gap-2 text-sm text-slate-700 ${contentFlow}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0C3156] flex-shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                         )}</>}
                         </>}

                        {/* Actions block: Register Now, Contact Us, Copy Link */}
                        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                          {/* 1. Register Now & Details */}
                          <div className={`flex gap-2 ${contentFlow}`}>
                            <button
                              data-testid={`button-register-${opp.id}`}
                              onClick={() => openModal(opp)}
                              className="flex-1 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm hover:opacity-95 flex items-center justify-center gap-1.5"
                              style={{ backgroundColor: "var(--m-primary)" }}
                            >
                              <span>{t("common.registerNow")}</span>
                            </button>
                            {contentSettings.showOpportunityDetails !== false && <Link
                              href={`/research/${opp.id}`}
                              data-testid={`button-detail-${opp.id}`}
                              className="flex items-center justify-center gap-1 border font-bold px-4 py-3 rounded-xl transition-colors text-sm bg-white hover:bg-slate-50"
                              style={{ borderColor: "color-mix(in oklab, var(--m-primary) 24%, transparent)", color: "var(--m-primary)" }}
                            >
                              <span>{t("common.details")}</span>
                              <ChevronLeft size={14} />
                            </Link>}
                          </div>

                          {/* 2. Inquiry Contact Button (تحت زر سجل الآن مباشرة بتخصيص الأدمن) */}
                          {(() => {
                            const inquiries = buildOpportunityInquiryLinks(
                              contentSettings.brand,
                              displayTitle(opp),
                              language as "ar" | "en"
                            );
                            if (!inquiries.length) return null;

                            return (<div className="space-y-2 mb-2">{inquiries.map((inquiry) => (
<a key={inquiry.channel}
                                href={inquiry.href}
                                target={inquiry.isExternal && inquiry.channel !== "email" && inquiry.channel !== "phone" ? "_blank" : undefined}
                                rel={inquiry.isExternal && inquiry.channel !== "email" && inquiry.channel !== "phone" ? "noopener noreferrer" : undefined}
                                data-testid={`button-contact-${opp.id}`}
                                className={`w-full font-bold py-2.5 rounded-xl text-xs text-center transition-all flex items-center justify-center gap-2 shadow-2xs ${
                                  inquiry.channel === "whatsapp"
                                    ? "border border-emerald-500/35 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                                    : inquiry.channel === "telegram"
                                    ? "border border-sky-500/35 bg-sky-50 hover:bg-sky-100 text-sky-800"
                                    : inquiry.channel === "email"
                                    ? "border border-amber-500/35 bg-amber-50 hover:bg-amber-100 text-amber-800"
                                    : inquiry.channel === "phone"
                                    ? "border border-blue-500/35 bg-blue-50 hover:bg-blue-100 text-blue-800"
                                    : "border border-purple-500/35 bg-purple-50 hover:bg-purple-100 text-purple-800"
                                }`}
                              >
                                {inquiry.channel === "whatsapp" && <MessageCircle size={15} className="text-emerald-600 shrink-0" />}
                                {inquiry.channel === "telegram" && <Send size={14} className="text-sky-600 shrink-0" />}
                                {inquiry.channel === "email" && <Mail size={14} className="text-amber-600 shrink-0" />}
                                {inquiry.channel === "phone" && <Phone size={14} className="text-blue-600 shrink-0" />}
                                {inquiry.channel === "custom_url" && <ExternalLink size={14} className="text-purple-600 shrink-0" />}
                                <span className="truncate">
                                  {language === "ar" ? inquiry.labelAr : inquiry.labelEn}
                                </span>
                              </a>)) }</div>);
                          })()}

                          {/* 3. Copy Opportunity Link (زر نسخ الرابط) */}
                          <button
                            type="button"
                            data-testid={`button-copy-link-${opp.id}`}
                            className={`w-full text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 font-medium border ${
                              copiedOppId === opp.id
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border-slate-200/60"
                            }`}
                            onClick={() => handleCopyOppLink(opp)}
                          >
                            {copiedOppId === opp.id ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span>{localize("تم نسخ الفرصة ورابط التسجيل", "Opportunity and registration link copied")}</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} className="text-slate-400" />
                                 <span>{copyErrorId === opp.id ? localize("تعذر النسخ التلقائي؛ انسخ الرابط أدناه", "Automatic copy failed; copy the link below") : localize("نسخ رابط الفرصة", "Copy opportunity link")}</span>
                              </>
                            )}
                          </button>
                           {copyErrorId === opp.id && <textarea readOnly rows={5} dir={direction} aria-label={localize("الفرصة ورابط المشاركة للنسخ اليدوي", "Opportunity and share link for manual copy")} value={getOpportunityShareText(opp, window.location.origin, language)} onFocus={(event) => event.currentTarget.select()} className="w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600" />}
                        </div>
                      </div>
                    );
                  })}
                      </div>
                    </section>
                   ))}
                </div>
              )}

        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-start">
            <h2 className="text-xl font-black text-[#0C3156]">{localize("مكتبة المعرفة", "Knowledge library")}</h2>
            <p className="mt-1 text-sm text-slate-600">{localize("أدلة ومقالات عن منهجية البحث والنشر في مركز المعرفة.", "Guides and articles on research methods and publishing in the Knowledge Center.")}</p>
          </div>
          <Link href="/knowledge-center" data-testid="link-portal-knowledge" className="inline-flex items-center justify-center rounded-xl bg-[#0C3156] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0a2847]">{localize("افتح مركز المعرفة", "Open the Knowledge Center")}</Link>
        </div>
      </section>

      <RegistrationModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedResearch(null); }}
        researchTitle={selectedResearch ? displayTitle(selectedResearch) : ""}
        researchId={selectedResearch?.id}
        firstAuthorSeatsLeft={selectedResearch?.firstAuthorSeatsLeft}
        coAuthorSeatsLeft={selectedResearch?.coAuthorSeatsLeft}
        priceOriginalSar={selectedResearch?.priceOriginalSar}
        priceDiscountedSar={selectedResearch?.priceDiscountedSar}
        includedServices={selectedResearch?.includedServices}
        showFeeDetails={selectedResearch ? isFieldVisible(selectedResearch, "price") : false}
        showResearchReference={selectedResearch ? isFieldVisible(selectedResearch, "title") : false}
        showSeatDetails={selectedResearch ? isFieldVisible(selectedResearch, "seats") : false}
        totalSeats={selectedResearch && isFieldVisible(selectedResearch, "seats") ? selectedResearch.totalSeats : undefined}
        targetJournal={selectedResearch && isFieldVisible(selectedResearch, "journal") ? selectedResearch.journalTarget : ""}
        specialty={selectedResearch && isFieldVisible(selectedResearch, "specialty") ? localize(selectedResearch.specialtyAr, selectedResearch.specialtyEn, selectedResearch.specialty) : ""}
        onRegistered={refreshOpportunities}
      />
    </div>
  );
}

function formatOpportunityDeadline(value: string, language: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
