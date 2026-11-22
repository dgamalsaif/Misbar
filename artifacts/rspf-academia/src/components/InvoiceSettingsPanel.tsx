import { useRef, useState, type ReactNode, type RefObject } from "react";
import { ImagePlus, LoaderCircle, Stamp, Trash2 } from "lucide-react";
import type { InvoiceSettings } from "@/lib/siteContentSettings";

interface Props {
  settings: InvoiceSettings;
  fallbackLogoUrl: string;
  onChange: (settings: InvoiceSettings) => void;
  onBusyChange: (busy: boolean) => void;
}

export default function InvoiceSettingsPanel({ settings, fallbackLogoUrl, onChange, onBusyChange }: Props) {
  const logoInput = useRef<HTMLInputElement>(null);
  const stampInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "stamp" | null>(null);
  const [message, setMessage] = useState("");

  const update = (changes: Partial<InvoiceSettings>) => onChange({ ...settings, ...changes });
  const imageFallback = /\.mp4(?:[?#]|$)/i.test(fallbackLogoUrl) ? "" : fallbackLogoUrl;

  const uploadImage = async (file: File | undefined, target: "logo" | "stamp") => {
    if (!file) return;
    const input = target === "logo" ? logoInput.current : stampInput.current;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("اختر صورة PNG أو JPG أو WebP.");
      if (input) input.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("حجم الصورة أكبر من 10 ميغابايت.");
      if (input) input.value = "";
      return;
    }

    setUploading(target);
    onBusyChange(true);
    setMessage("");
    try {
      const response = await fetch("/api/site-brand-logo/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const result: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "تعذر رفع الصورة.";
        throw new Error(error);
      }
      if (!result || typeof result !== "object" || !("logoUrl" in result) || typeof result.logoUrl !== "string") {
        throw new Error("لم يصل رابط الصورة من الخادم.");
      }
      update(target === "logo" ? { logoUrl: result.logoUrl } : { stampUrl: result.logoUrl });
      setMessage(target === "logo"
        ? "تم رفع الشعار إلى التخزين الحالي. احفظ التغييرات لتطبيقه."
        : "تم رفع الختم إلى التخزين الحالي. احفظ التغييرات لتطبيقه.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(null);
      onBusyChange(false);
      if (input) input.value = "";
    }
  };

  const textField = (
    label: string,
    key: keyof InvoiceSettings,
    options: { multiline?: boolean; placeholder?: string; maxLength?: number } = {},
  ) => {
    const value = settings[key];
    if (typeof value !== "string") return null;
    const common = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {options.multiline ? (
          <textarea
            className={`${common} min-h-20 resize-y`}
            value={value}
            maxLength={options.maxLength}
            placeholder={options.placeholder}
            onChange={(event) => update({ [key]: event.target.value } as Partial<InvoiceSettings>)}
          />
        ) : (
          <input
            className={common}
            value={value}
            maxLength={options.maxLength}
            placeholder={options.placeholder}
            onChange={(event) => update({ [key]: event.target.value } as Partial<InvoiceSettings>)}
          />
        )}
      </label>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-xl bg-emerald-50 p-4">
        <div>
          <p className="font-semibold text-emerald-950">إصدار المستند بعد التسجيل</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            سيظهر للمشارك زر طباعة أو حفظ PDF بعد نجاح التسجيل. تُعرض الحالة دائمًا «غير مدفوعة»؛ لا يجمع الموقع أي مبلغ.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-emerald-950">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          تفعيل
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {textField("عنوان الفاتورة بالعربية", "titleAr", { maxLength: 120 })}
        {textField("عنوان الفاتورة بالإنجليزية", "titleEn", { maxLength: 120 })}
        {textField("اسم الجهة بالعربية", "issuerNameAr", { placeholder: "اتركه فارغًا لاستخدام اسم الموقع", maxLength: 160 })}
        {textField("اسم الجهة بالإنجليزية", "issuerNameEn", { placeholder: "Leave blank to use the site name", maxLength: 160 })}
        {textField("العنوان بالعربية", "addressAr", { multiline: true, maxLength: 300 })}
        {textField("العنوان بالإنجليزية", "addressEn", { multiline: true, maxLength: 300 })}
        {textField("الرقم الضريبي (اختياري)", "taxNumber", { maxLength: 80 })}
        {textField("هاتف الجهة", "phone", { maxLength: 80 })}
        {textField("بريد الجهة", "email", { maxLength: 160 })}
        {textField("بادئة رقم الفاتورة", "numberPrefix", { placeholder: "MIS", maxLength: 24 })}
        {textField("وصف البند بالعربية", "itemDescriptionAr", { multiline: true, maxLength: 240 })}
        {textField("وصف البند بالإنجليزية", "itemDescriptionEn", { multiline: true, maxLength: 240 })}
        {textField("ملاحظة أسفل الفاتورة بالعربية", "footerAr", { multiline: true, maxLength: 500 })}
        {textField("ملاحظة أسفل الفاتورة بالإنجليزية", "footerEn", { multiline: true, maxLength: 500 })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ImageControl
          title="شعار الفاتورة"
          icon={<ImagePlus className="h-4 w-4" />}
          inputRef={logoInput}
          imageUrl={settings.logoUrl || imageFallback}
          uploaded={Boolean(settings.logoUrl)}
          busy={uploading === "logo"}
          onSelect={(file) => void uploadImage(file, "logo")}
          onRemove={() => update({ logoUrl: "" })}
        />
        <ImageControl
          title="الختم الرسمي"
          icon={<Stamp className="h-4 w-4" />}
          inputRef={stampInput}
          imageUrl={settings.stampUrl}
          uploaded={Boolean(settings.stampUrl)}
          busy={uploading === "stamp"}
          onSelect={(file) => void uploadImage(file, "stamp")}
          onRemove={() => update({ stampUrl: "" })}
        />
      </div>
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      <p className="text-xs leading-5 text-amber-800">
        لا يحسب النظام ضريبة تلقائيًا ولا يصنّف المستند كفاتورة ضريبية. أضف بيانات الجهة والرقم الضريبي الصحيحين فقط.
      </p>
    </div>
  );
}

interface ImageControlProps {
  title: string;
  icon: ReactNode;
  inputRef: RefObject<HTMLInputElement | null>;
  imageUrl: string;
  uploaded: boolean;
  busy: boolean;
  onSelect: (file?: File) => void;
  onRemove: () => void;
}

function ImageControl({ title, icon, inputRef, imageUrl, uploaded, busy, onSelect, onRemove }: ImageControlProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="flex items-center gap-2 font-semibold text-slate-800">{icon}{title}</p>
      {imageUrl ? (
        <img src={imageUrl} alt={`معاينة ${title}`} onError={(event) => { event.currentTarget.style.display = "none"; }} className="mt-3 h-24 max-w-full rounded-lg border border-slate-100 bg-white object-contain p-2" />
      ) : (
        <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
          لم تُحدّد صورة بعد
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
          {busy ? "جارٍ الرفع..." : uploaded ? "استبدال الصورة" : "رفع صورة"}
        </button>
        {uploaded && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <Trash2 className="h-4 w-4" />
            إزالة
          </button>
        )}
      </div>
      {title === "شعار الفاتورة" && !uploaded && (
        <p className="mt-2 text-xs text-slate-500">يُستخدم شعار الموقع الحالي إلى أن ترفع شعارًا مخصصًا.</p>
      )}
    </div>
  );
}
