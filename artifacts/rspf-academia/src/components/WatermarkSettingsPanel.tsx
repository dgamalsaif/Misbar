import type { WatermarkSettings } from "@/lib/siteContentSettings";

interface Props {
  settings: WatermarkSettings;
  onChange: (settings: WatermarkSettings) => void;
}

export default function WatermarkSettingsPanel({ settings, onChange }: Props) {
  const update = (changes: Partial<WatermarkSettings>) => onChange({ ...settings, ...changes });
  const fieldClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4">
        <div>
          <p className="font-semibold text-emerald-950">إعداد العلامة على محتوى الفرص</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">تظهر العلامة فوق بطاقات وتفاصيل الفرص. تعطيلها لا يغيّر إعدادات إخفاء العناوين أو منع النسخ.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-emerald-950">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
          إظهار العلامة المائية
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">النص بالعربية
          <input className={fieldClass} maxLength={80} value={settings.textAr} onChange={(event) => update({ textAr: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-700">النص بالإنجليزية
          <input className={fieldClass} maxLength={80} value={settings.textEn} onChange={(event) => update({ textEn: event.target.value })} dir="ltr" />
        </label>
        <label className="block text-sm font-medium text-slate-700">لون العلامة
          <span className="mt-1 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <input aria-label="لون العلامة المائية" type="color" value={settings.color} onChange={(event) => update({ color: event.target.value })} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
            <span dir="ltr" className="font-mono text-xs text-slate-600">{settings.color}</span>
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          درجة الظهور: {Math.round(settings.opacity * 100)}%
          <input type="range" min={3} max={30} value={Math.round(settings.opacity * 100)} onChange={(event) => update({ opacity: Number(event.target.value) / 100 })} className="mt-3 w-full accent-emerald-700" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          حجم النص: {settings.fontSize}px
          <input type="range" min={8} max={28} value={settings.fontSize} onChange={(event) => update({ fontSize: Number(event.target.value) })} className="mt-3 w-full accent-emerald-700" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          ميلان العلامة: {settings.angle}°
          <input type="range" min={-45} max={45} value={settings.angle} onChange={(event) => update({ angle: Number(event.target.value) })} className="mt-3 w-full accent-emerald-700" />
        </label>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-bold text-slate-500">معاينة تقريبية</p>
        <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          {settings.enabled && settings.textAr && <span style={{ color: settings.color, opacity: settings.opacity, fontSize: settings.fontSize, transform: `rotate(${settings.angle}deg)` }} className="font-bold">{settings.textAr}</span>}
        </div>
      </div>
    </div>
  );
}
