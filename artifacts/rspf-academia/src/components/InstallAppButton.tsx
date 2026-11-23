import { useEffect, useState } from "react";
import { Check, Download, Smartphone, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { DEFAULT_SITE_CONTENT_SETTINGS, getPwaIconUrl } from "@/lib/siteContentSettings";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallAppButton({ className = "" }: { className?: string }) {
  const { direction, language, localize } = useLanguage();
  const { data: settings = DEFAULT_SITE_CONTENT_SETTINGS } = useSiteContentSettings();
  const appName = settings.brand.appNameAr || settings.brand.appNameEn || settings.brand.siteNameAr || "Misbar";
  const appIcon = getPwaIconUrl(192, settings.brand);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isAppInstalled);
  const [installError, setInstallError] = useState(false);

  useEffect(() => {
    const captureInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncInstalledState = () => setInstalled(isAppInstalled());
    window.addEventListener("beforeinstallprompt", captureInstall);
    displayMode.addEventListener("change", syncInstalledState);
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setIsOpen(false);
      setInstalling(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstall);
      displayMode.removeEventListener("change", syncInstalledState);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) {
      return;
    }
    const pendingInstall = installEvent;
    setInstalling(true);
    setInstallError(false);
    try {
      await pendingInstall.prompt();
      const choice = await pendingInstall.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setIsOpen(false);
      }
    } catch {
      setInstallError(true);
    } finally {
      setInstallEvent(null);
      setInstalling(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} data-testid="button-install-app" className={className} aria-label={localize("تحميل التطبيق", "Install app")}>
        {installed ? <Check size={15} /> : <Download size={15} />}
        {installed ? localize("التطبيق مثبت", "App installed") : localize("تحميل التطبيق", "Install app")}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" onClick={() => setIsOpen(false)} role="dialog" aria-modal="true" aria-label={localize(`تثبيت تطبيق ${appName}`, `Install ${appName} app`)}>
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
          <section className="relative w-full max-w-sm rounded-3xl border border-emerald-100 bg-white p-6 text-start shadow-2xl" dir={direction} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setIsOpen(false)} className="absolute left-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={localize("إغلاق نافذة التثبيت", "Close install dialog")}><X size={18} /></button>
            <div className="flex items-center gap-3 pl-8">
              <img src={appIcon} alt={localize(`أيقونة ${appName}`, `${appName} icon`)} className="h-14 w-14 rounded-2xl border border-emerald-100 object-cover shadow-sm" />
              <div>
                <p className="text-xs font-black text-[#117b59]">{localize("تطبيق المنصة", "Platform app")}</p>
                <h2 className="mt-1 text-lg font-black text-slate-800">{appName}</h2>
              </div>
            </div>
            {installed ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                <div className="flex items-center gap-2 text-[#117b59]"><Check size={18} /><h3 className="text-sm font-black">{localize("التطبيق مثبت على جهازك", "The app is installed")}</h3></div>
                <p className="mt-2 text-xs leading-6 text-slate-600">{localize("يمكنك فتح مسبار من أيقونته على الشاشة الرئيسية. ستُحدّث النسخة عند توفر اتصال بالإنترنت.", "Open Misbar from its home-screen icon. The app updates when an internet connection is available.")}</p>
              </div>
            ) : installEvent ? (
              <>
                <p className="mt-5 text-sm leading-7 text-slate-600">{localize("ثبّت المنصة على جهازك للوصول السريع إلى الفرص البحثية وبوابة المنسق مباشرة من شاشة الهاتف أو سطح المكتب.", "Install the platform for quick access to research opportunities and the coordinator portal from your phone or desktop.")}</p>
                <button type="button" onClick={() => void install()} disabled={installing} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#117b59] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#0c6549] disabled:cursor-wait disabled:opacity-70">
                  <Download size={17} /> {installing ? localize("جارٍ فتح التثبيت...", "Opening installation...") : localize("تثبيت التطبيق الآن", "Install app now")}
                </button>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-[#117b59]"><Smartphone size={18} /><h3 className="text-sm font-black">{localize("أضف التطبيق إلى جهازك", "Add the app to your device")}</h3></div>
                <p className="mt-2 text-xs leading-6 text-slate-600">{language === "ar" ? <>من قائمة المتصفح اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>. قد يظهر خيار التثبيت بعد فتح الموقع من Chrome أو Edge مرة أخرى.</> : <>From your browser menu, choose <strong>“Install app”</strong> or <strong>“Add to Home Screen.”</strong> The install option may appear after reopening the site in Chrome or Edge.</>}</p>
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                  <p>{language === "ar"
                    ? <><strong>Android:</strong> افتح الموقع أو التطبيق المثبّت مجدداً وانتظر تحديثه. إذا بقيت الأيقونة القديمة، أزل الاختصار أو التطبيق وأعد تثبيته؛ قد يؤخر المشغّل تحديث الأيقونة.</>
                    : <><strong>Android:</strong> Reopen the site or installed app and allow it to update. If the old icon remains, remove the shortcut or app and install it again; the launcher may delay icon updates.</>}</p>
                  <p>{language === "ar"
                    ? <><strong>iPhone:</strong> يلتقط Safari الأيقونة عند الإضافة وقد يحتفظ بها. احذف الاختصار القديم، ثم افتح الموقع في Safari واختر «إضافة إلى الشاشة الرئيسية» من قائمة المشاركة.</>
                    : <><strong>iPhone:</strong> Safari captures the icon when you add it and may keep that copy. Delete the old shortcut, open the site in Safari, then choose “Add to Home Screen” from Share.</>}</p>
                  <p className="text-slate-500">{language === "ar"
                    ? "قد يختلف شكل القص: iPhone يستخدم زوايا مستديرة، بينما قد يقصّ Android الأيقونة إلى دائرة أو شكل يحدده المشغّل. اترك الشعار المهم في منتصف الصورة."
                    : "Icon cropping can differ: iPhone uses rounded corners, while Android may use a circle or launcher-specific mask. Keep important artwork centered."}</p>
                </div>
              </div>
            )}
            {installError && !installed && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900" role="alert">
                {localize("لم يكتمل التثبيت من هذه النافذة. افتح قائمة المتصفح واتبع تعليمات جهازك أعلاه.", "Installation did not finish in this dialog. Open your browser menu and follow the device instructions above.")}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}