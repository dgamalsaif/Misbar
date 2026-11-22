import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

export type CountryOption = {
  name: string;
  nameEn: string;
  code: string;
  flag: string;
  aliases?: string[];
};

export const COUNTRIES: CountryOption[] = [
  { name: "المملكة العربية السعودية", nameEn: "Saudi Arabia", code: "+966", flag: "🇸🇦", aliases: ["السعودية", "saudi"] },
  { name: "اليمن", nameEn: "Yemen", code: "+967", flag: "🇾🇪", aliases: ["yemen"] },
  { name: "الإمارات العربية المتحدة", nameEn: "United Arab Emirates", code: "+971", flag: "🇦🇪", aliases: ["الإمارات", "uae"] },
  { name: "الكويت", nameEn: "Kuwait", code: "+965", flag: "🇰🇼", aliases: ["kuwait"] },
  { name: "قطر", nameEn: "Qatar", code: "+974", flag: "🇶🇦", aliases: ["qatar"] },
  { name: "البحرين", nameEn: "Bahrain", code: "+973", flag: "🇧🇭", aliases: ["bahrain"] },
  { name: "عُمان", nameEn: "Oman", code: "+968", flag: "🇴🇲", aliases: ["oman"] },
  { name: "مصر", nameEn: "Egypt", code: "+20", flag: "🇪🇬", aliases: ["egypt"] },
  { name: "الأردن", nameEn: "Jordan", code: "+962", flag: "🇯🇴", aliases: ["jordan"] },
  { name: "العراق", nameEn: "Iraq", code: "+964", flag: "🇮🇶", aliases: ["iraq"] },
  { name: "سوريا", nameEn: "Syria", code: "+963", flag: "🇸🇾", aliases: ["syria"] },
  { name: "لبنان", nameEn: "Lebanon", code: "+961", flag: "🇱🇧", aliases: ["lebanon"] },
  { name: "فلسطين", nameEn: "Palestine", code: "+970", flag: "🇵🇸", aliases: ["palestine"] },
  { name: "المغرب", nameEn: "Morocco", code: "+212", flag: "🇲🇦", aliases: ["morocco"] },
  { name: "الجزائر", nameEn: "Algeria", code: "+213", flag: "🇩🇿", aliases: ["algeria"] },
  { name: "تونس", nameEn: "Tunisia", code: "+216", flag: "🇹🇳", aliases: ["tunisia"] },
  { name: "ليبيا", nameEn: "Libya", code: "+218", flag: "🇱🇾", aliases: ["libya"] },
  { name: "السودان", nameEn: "Sudan", code: "+249", flag: "🇸🇩", aliases: ["sudan"] },
  { name: "تركيا", nameEn: "Turkey", code: "+90", flag: "🇹🇷", aliases: ["turkey"] },
  { name: "المملكة المتحدة", nameEn: "United Kingdom", code: "+44", flag: "🇬🇧", aliases: ["uk", "britain"] },
  { name: "الولايات المتحدة", nameEn: "United States", code: "+1", flag: "🇺🇸", aliases: ["usa", "america"] },
  { name: "كندا", nameEn: "Canada", code: "+1", flag: "🇨🇦", aliases: ["canada"] },
  { name: "ألمانيا", nameEn: "Germany", code: "+49", flag: "🇩🇪", aliases: ["germany"] },
  { name: "فرنسا", nameEn: "France", code: "+33", flag: "🇫🇷", aliases: ["france"] },
  { name: "أستراليا", nameEn: "Australia", code: "+61", flag: "🇦🇺", aliases: ["australia"] },
  { name: "الهند", nameEn: "India", code: "+91", flag: "🇮🇳", aliases: ["india"] },
  { name: "باكستان", nameEn: "Pakistan", code: "+92", flag: "🇵🇰", aliases: ["pakistan"] },
  { name: "الصين", nameEn: "China", code: "+86", flag: "🇨🇳", aliases: ["china"] },
  { name: "اليابان", nameEn: "Japan", code: "+81", flag: "🇯🇵", aliases: ["japan"] },
  { name: "كوريا الجنوبية", nameEn: "South Korea", code: "+82", flag: "🇰🇷", aliases: ["korea"] },
  { name: "إندونيسيا", nameEn: "Indonesia", code: "+62", flag: "🇮🇩", aliases: ["indonesia"] },
  { name: "ماليزيا", nameEn: "Malaysia", code: "+60", flag: "🇲🇾", aliases: ["malaysia"] },
  { name: "سنغافورة", nameEn: "Singapore", code: "+65", flag: "🇸🇬", aliases: ["singapore"] },
  { name: "الفلبين", nameEn: "Philippines", code: "+63", flag: "🇵🇭", aliases: ["philippines"] },
  { name: "بنغلاديش", nameEn: "Bangladesh", code: "+880", flag: "🇧🇩", aliases: ["bangladesh"] },
  { name: "أفغانستان", nameEn: "Afghanistan", code: "+93", flag: "🇦🇫", aliases: ["afghanistan"] },
  { name: "نيبال", nameEn: "Nepal", code: "+977", flag: "🇳🇵", aliases: ["nepal"] },
  { name: "جنوب أفريقيا", nameEn: "South Africa", code: "+27", flag: "🇿🇦", aliases: ["south africa"] },
  { name: "نيجيريا", nameEn: "Nigeria", code: "+234", flag: "🇳🇬", aliases: ["nigeria"] },
  { name: "كينيا", nameEn: "Kenya", code: "+254", flag: "🇰🇪", aliases: ["kenya"] },
  { name: "إثيوبيا", nameEn: "Ethiopia", code: "+251", flag: "🇪🇹", aliases: ["ethiopia"] },
  { name: "غانا", nameEn: "Ghana", code: "+233", flag: "🇬🇭", aliases: ["ghana"] },
  { name: "البرازيل", nameEn: "Brazil", code: "+55", flag: "🇧🇷", aliases: ["brazil"] },
  { name: "المكسيك", nameEn: "Mexico", code: "+52", flag: "🇲🇽", aliases: ["mexico"] },
  { name: "أيرلندا", nameEn: "Ireland", code: "+353", flag: "🇮🇪", aliases: ["ireland"] },
  { name: "إسبانيا", nameEn: "Spain", code: "+34", flag: "🇪🇸", aliases: ["spain"] },
  { name: "إيطاليا", nameEn: "Italy", code: "+39", flag: "🇮🇹", aliases: ["italy"] },
  { name: "هولندا", nameEn: "Netherlands", code: "+31", flag: "🇳🇱", aliases: ["netherlands", "holland"] },
  { name: "السويد", nameEn: "Sweden", code: "+46", flag: "🇸🇪", aliases: ["sweden"] },
  { name: "النرويج", nameEn: "Norway", code: "+47", flag: "🇳🇴", aliases: ["norway"] },
  { name: "سويسرا", nameEn: "Switzerland", code: "+41", flag: "🇨🇭", aliases: ["switzerland"] },
  { name: "نيوزيلندا", nameEn: "New Zealand", code: "+64", flag: "🇳🇿", aliases: ["new zealand"] },
  { name: "سريلانكا", nameEn: "Sri Lanka", code: "+94", flag: "🇱🇰", aliases: ["sri lanka"] },
  { name: "الصومال", nameEn: "Somalia", code: "+252", flag: "🇸🇴", aliases: ["somalia"] },
  { name: "موريتانيا", nameEn: "Mauritania", code: "+222", flag: "🇲🇷", aliases: ["mauritania"] },
];

interface CountrySelectorProps {
  country: string;
  onCountryChange: (country: string) => void;
  dialCode: string;
  onDialCodeChange: (code: string) => void;
  id?: string;
  required?: boolean;
  compact?: boolean;
  label?: string;
}

/**
 * A searchable country dial-code picker. Selecting a dial code always updates
 * the associated country, keeping phone and location data consistent.
 */
export default function CountrySelector({
  country,
  onCountryChange,
  dialCode,
  onDialCodeChange,
  id = "country",
  required = false,
  compact = false,
  label,
}: CountrySelectorProps) {
  const { direction, language, localize } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(dialCode);
  const [manual, setManual] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(dialCode), [dialCode]);
  useEffect(() => {
    if (!COUNTRIES.some((item) => item.name === country || item.nameEn === country)) setManual(true);
  }, [country]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COUNTRIES;
    return COUNTRIES.filter((item) =>
      [item.name, item.nameEn, item.code, ...(item.aliases || [])].some((entry) => entry.toLowerCase().includes(normalized)),
    );
  }, [query]);

  const selectedCountry = COUNTRIES.find((item) => item.name === country || item.nameEn === country);
  const selected = selectedCountry;
  const choose = (item: CountryOption) => {
    onCountryChange(item.name);
    onDialCodeChange(item.code);
    setQuery(item.code);
    setManual(false);
    setOpen(false);
  };
  const startManualEntry = () => {
    setManual(true);
    setOpen(false);
    onCountryChange("");
    onDialCodeChange("");
  };

  return (
    <div ref={root} className="relative" dir={direction}>
      <div>
        <label htmlFor={`${id}-country-search`} className="mb-1.5 block text-right text-sm font-semibold text-slate-700">
          {label || localize("الدولة ومفتاح الاتصال", "Country and calling code")} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          id={`${id}-country-search`}
          aria-label={localize("اختر الدولة ومفتاح الاتصال", "Choose country and calling code")}
          aria-expanded={open}
          onClick={() => { setQuery(""); setOpen((value) => !value); }}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm outline-none transition focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/15"
        >
          <span className="text-xl" aria-hidden="true">{selected?.flag || "🌐"}</span>
          <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
            {selected ? (language === "ar" ? selected.name : selected.nameEn) : country || localize("اختر الدولة أو أدخلها يدوياً", "Choose a country or enter it manually")}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-[#117b59]" dir="ltr">{dialCode || localize("الرمز", "Code")}</span>
          <ChevronDown size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={15} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id={`${id}-country-search-field`}
            data-testid={`input-${id}-dial-code`}
            aria-label={localize("ابحث باسم الدولة أو مفتاح الاتصال", "Search by country name or calling code")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={localize("اكتب اسم الدولة أو +966", "Type a country or +966")}
            dir={language === "ar" ? "auto" : "ltr"}
            autoFocus
            className="w-full rounded-lg bg-slate-50 py-2.5 pe-3 ps-9 text-sm outline-none focus:ring-2 focus:ring-[#117b59]/15"
          />
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5">
            {matches.length ? matches.map((item) => (
              <button
                type="button"
                key={`${item.name}-${item.code}`}
                onClick={() => choose(item)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition hover:bg-[#f3fbf8]"
              >
                <span className="text-lg">{item.flag}</span>
                <span className="flex-1 font-medium text-slate-700">{language === "ar" ? item.name : item.nameEn}</span>
                <span className="font-bold text-[#117b59]" dir="ltr">{item.code}</span>
              </button>
            )) : <p className="px-3 py-3 text-center text-xs text-slate-400">{localize("لا توجد دولة مطابقة للبحث", "No matching country found")}</p>}
            <button type="button" onClick={startManualEntry} className="mt-1 flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-bold text-[#0c3156] hover:bg-slate-50">
              {localize("أدخل الدولة ورمز الاتصال يدوياً", "Enter country and calling code manually")}
            </button>
          </div>
        </div>
      )}

      {manual && (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
          <input
            id={`${id}-country`}
            data-testid={`input-${id}-country`}
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
            placeholder={localize("اسم الدولة", "Country name")}
            required={required}
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/15"
          />
          <input
            id={`${id}-dial-code`}
            value={dialCode}
            onChange={(event) => onDialCodeChange(event.target.value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 6))}
            placeholder="+000"
            aria-label={localize("مفتاح الاتصال الدولي", "International calling code")}
            dir="ltr"
            required={required}
            className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/15"
          />
        </div>
      )}
      {compact && <p className="mt-1 text-[11px] text-slate-500">{localize("سيُستخدم المفتاح نفسه مع رقم واتساب.", "The selected calling code will be used with the WhatsApp number.")}</p>}
    </div>
  );
}