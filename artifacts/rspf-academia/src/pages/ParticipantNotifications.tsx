import { useEffect, useRef, useState } from "react";
import { Bell, Check, LoaderCircle, LogOut, Mail, RefreshCw, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

type ParticipantNotification = {
  id: number;
  opportunityId: number;
  stage: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationPreferences = {
  emailEnabled: boolean;
  emailVerified: boolean;
  pushEnabled: boolean;
  pushAvailable: boolean;
};

type InboxResponse = {
  notifications: ParticipantNotification[];
  unreadCount: number;
  pushDevices: { id: number; deviceLabel: string; createdAt: string; updatedAt: string }[];
  preferences: NotificationPreferences;
};

type PushConfigResponse = {
  enabled: boolean;
  publicKey: string | null;
};

const labels: Record<string, { ar: string; en: string }> = {
  general_update: { ar: "تحديث بحثي", en: "Research update" },
  seats_full: { ar: "اكتملت المقاعد", en: "Seats filled" },
  ethics_approved: { ar: "موافقة أخلاقية / PROSPERO", en: "Ethics / PROSPERO approved" },
  submitted: { ar: "تم الرفع في المجلة", en: "Submitted to journal" },
  under_review: { ar: "قيد مراجعة المجلة", en: "Under journal review" },
  accepted: { ar: "مقبولة", en: "Accepted" },
  published: { ar: "تم النشر", en: "Published" },
  completed: { ar: "اكتمل البحث", en: "Research completed" },
};

function messageFromResponse(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") return data.error;
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message;
  return fallback;
}

async function responseJson(response: Response) {
  return response.json().catch(() => ({}));
}

function decodeVapidKey(encoded: string) {
  const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
  const normalized = (encoded + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export default function ParticipantNotifications() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [email, setEmail] = useState("");
  const [inbox, setInbox] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const accessHandled = useRef("");
  const unsubscribeHandled = useRef("");

  const loadInbox = async () => {
    const response = await apiFetch("/api/participant/notifications", { cache: "no-store" });
    if (response.status === 401) {
      setInbox(null);
      setLoading(false);
      return;
    }
    const data = await responseJson(response);
    if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر تحميل الإشعارات." : "Could not load notifications."));
    setInbox(data as InboxResponse);
    setLoading(false);
  };

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (location === "/notifications/verify" && token && accessHandled.current !== token) {
      accessHandled.current = token;
      setWorking(true);
      setError("");
      void apiFetch("/api/participant/notifications/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then(async (response) => {
        const data = await responseJson(response);
        if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "انتهت صلاحية الرابط. اطلب رابطاً جديداً." : "This link expired. Request a new one."));
        setEmail(typeof data.email === "string" ? data.email : "");
        setMessage(isArabic ? "تم التحقق من بريدك. صندوق الإشعارات جاهز." : "Your email is verified. The inbox is ready.");
        window.history.replaceState({}, "", "/notifications");
        setLocation("/notifications");
      }).catch((cause) => setError(cause instanceof Error ? cause.message : "حدث خطأ."))
        .finally(() => {
          setLoading(false);
          setWorking(false);
        });
      return;
    }
    if (location === "/notifications/verify" && !token) {
      setError(isArabic ? "رابط التحقق لا يحتوي على رمز صالح." : "The verification link is missing its token.");
      setLoading(false);
      setLocation("/notifications");
      return;
    }

    const unsubscribeToken = location === "/notifications/unsubscribe" ? token : "";
    if (unsubscribeToken && unsubscribeHandled.current !== unsubscribeToken) {
      unsubscribeHandled.current = unsubscribeToken;
      setWorking(true);
      setError("");
      void apiFetch("/api/participant/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unsubscribeToken }),
      }).then(async (response) => {
        const data = await responseJson(response);
        if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر إيقاف رسائل البريد." : "Could not unsubscribe."));
        setMessage(messageFromResponse(data, isArabic ? "تم إيقاف رسائل تحديثات البحث." : "Research update emails are disabled."));
        window.history.replaceState({}, "", "/notifications/unsubscribe");
      }).catch((cause) => setError(cause instanceof Error ? cause.message : "حدث خطأ."))
        .finally(() => {
          setLoading(false);
          setWorking(false);
        });
      return;
    }
    if (location === "/notifications/unsubscribe" && !token) {
      setError(isArabic ? "رابط إيقاف البريد لا يحتوي على رمز صالح." : "The unsubscribe link is missing its token.");
      setLoading(false);
      return;
    }

    if (location === "/notifications") {
      setLoading(true);
      void loadInbox().catch((cause) => {
        setError(cause instanceof Error ? cause.message : isArabic ? "تعذر تحميل الإشعارات." : "Could not load notifications.");
        setLoading(false);
      });
    }
  }, [location, isArabic, setLocation]);

  useEffect(() => {
    if (!inbox || location !== "/notifications") return;
    const timer = window.setInterval(() => {
      void loadInbox().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [Boolean(inbox), location]);

  const requestAccessLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch("/api/participant/notifications/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر إرسال الرابط." : "Could not send the link."));
      setMessage(messageFromResponse(data, isArabic ? "إذا كان البريد مرتبطاً بتسجيل، فسيصلك رابط دخول آمن قريباً." : "If this email is linked to a registration, a secure sign-in link will arrive shortly."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setWorking(false);
    }
  };

  const updateEmailPreference = async (emailEnabled: boolean) => {
    if (!inbox) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch("/api/participant/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر حفظ التفضيل." : "Could not save the preference."));
      setInbox({ ...inbox, preferences: data as NotificationPreferences });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر حفظ التفضيل." : "Could not save the preference.");
    } finally {
      setWorking(false);
    }
  };

  const enablePush = async () => {
    setWorking(true);
    setError("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error(isArabic ? "هذا المتصفح لا يدعم إشعارات الهاتف." : "This browser does not support push notifications.");
      }
      const configResponse = await apiFetch("/api/participant/notifications/push-config", { cache: "no-store" });
      const config = await responseJson(configResponse) as PushConfigResponse;
      if (!configResponse.ok || !config.enabled || !config.publicKey) {
        throw new Error(isArabic ? "إشعارات الهاتف غير مهيأة بعد على خادم Render." : "Push notifications are not configured on Render yet.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(isArabic ? "لم تسمح بإشعارات المتصفح. يمكنك تفعيلها من إعدادات الهاتف." : "Notification permission was not granted. Enable it in your phone settings.");
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        throw new Error(isArabic ? "افتح الموقع المنشور على srmaacademy.com ثم أعد المحاولة." : "Open the published site on srmaacademy.com and try again.");
      }
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(config.publicKey) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error(isArabic ? "تعذر قراءة إعداد إشعارات هذا المتصفح." : "Could not read this browser's push subscription.");
      }
      const response = await apiFetch("/api/participant/notifications/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر حفظ الاشتراك." : "Could not save the push subscription."));
      await loadInbox();
      setMessage(isArabic ? "تم تفعيل إشعارات الهاتف لهذا المتصفح." : "Phone notifications are enabled for this browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر تفعيل الإشعارات." : "Could not enable notifications.");
    } finally {
      setWorking(false);
    }
  };

  const disablePush = async () => {
    setWorking(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        await loadInbox();
        setMessage(isArabic
          ? "لا يوجد اشتراك نشط في هذا المتصفح. يمكنك إزالة الأجهزة المفعّلة من القائمة."
          : "This browser has no active subscription. Remove enabled devices from the list below.");
        return;
      }
      const response = await apiFetch("/api/participant/notifications/push-subscriptions/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر إيقاف إشعارات الهاتف." : "Could not disable push notifications."));
      await subscription.unsubscribe();
      await loadInbox();
      setMessage(isArabic ? "تم إيقاف إشعارات الهاتف لهذا المتصفح." : "Phone notifications are disabled for this browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر إيقاف الإشعارات." : "Could not disable push notifications.");
    } finally {
      setWorking(false);
    }
  };

  const removeDevice = async (deviceId: number) => {
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`/api/participant/notifications/push-subscriptions/${deviceId}`, {
        method: "DELETE",
      });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(messageFromResponse(data, isArabic ? "تعذر إزالة الجهاز." : "Could not remove device."));
      setInbox(data as InboxResponse);
      setMessage(isArabic ? "تمت إزالة الجهاز من إشعارات الهاتف." : "The device was removed from phone notifications.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر إزالة الجهاز." : "Could not remove device.");
    } finally {
      setWorking(false);
    }
  };

  const markRead = async (notification: ParticipantNotification) => {
    if (!inbox || notification.readAt) return;
    try {
      const response = await apiFetch(`/api/participant/notifications/${notification.id}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error(isArabic ? "تعذر تحديث حالة الإشعار." : "Could not update notice status.");
      const updated = await response.json() as ParticipantNotification;
      setInbox({
        ...inbox,
        unreadCount: Math.max(0, inbox.unreadCount - 1),
        notifications: inbox.notifications.map((item) => item.id === updated.id ? updated : item),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : isArabic ? "تعذر تحديث الإشعار." : "Could not update notice.");
    }
  };

  const logout = async () => {
    setWorking(true);
    try {
      await apiFetch("/api/participant/notifications/logout", { method: "POST" });
      setInbox(null);
      setEmail("");
      setMessage(isArabic ? "تم تسجيل الخروج من صندوق الإشعارات." : "You have signed out of the inbox.");
    } finally {
      setWorking(false);
    }
  };

  const heading = isArabic ? "إشعارات أبحاثك" : "Your research updates";

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12" dir={isArabic ? "rtl" : "ltr"}>
      <div className="m-card overflow-hidden">
        <div className="bg-gradient-to-l from-[#0C3156] to-[#117b59] px-6 py-7 text-white sm:px-9">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Bell size={24} /></span>
            <div>
              <p className="text-xs font-bold text-white/75">{isArabic ? "مسبار | متابعة البحث" : "Misbar | Research tracking"}</p>
              <h1 className="mt-1 text-2xl font-black">{heading}</h1>
            </div>
            {inbox && <span className="ms-auto rounded-full bg-white/15 px-3 py-1 text-sm font-black">{inbox.unreadCount}</span>}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85">
            {isArabic
              ? "تابع انتقال البحث إلى المراحل الجديدة عبر البريد أو إشعار الهاتف، مع إبقاء تفاصيل البحث داخل صندوقك الآمن."
              : "Follow research stage changes by email or phone push, with research details kept inside your secure inbox."}
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-8">
          {(error || message) && (
            <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              {error || message}
            </div>
          )}

          {working && (
            <div className="flex items-center gap-2 text-sm font-bold text-[#117b59]" role="status">
              <LoaderCircle size={18} className="animate-spin" />
              {isArabic ? "جارٍ تنفيذ الطلب..." : "Working..."}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              {isArabic ? "جارٍ تحميل صندوق الإشعارات..." : "Loading your inbox..."}
            </div>
          ) : !inbox ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <Mail size={19} className="text-[#117b59]" />
                {isArabic ? "افتح صندوقك بأمان" : "Securely open your inbox"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isArabic
                  ? "أدخل البريد المسجل في الفرصة. سنرسل رابطاً لمرة واحدة؛ لا نكشف ما إذا كان البريد موجوداً في الموقع."
                  : "Enter the email used for your research registration. We’ll send a one-time link and won’t reveal whether an address is registered."}
              </p>
              <form onSubmit={requestAccessLink} className="mt-5 space-y-3">
                <label className="block text-sm font-bold text-slate-700" htmlFor="participant-notification-email">
                  {isArabic ? "البريد الإلكتروني" : "Email address"}
                </label>
                <input
                  id="participant-notification-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={isArabic ? "البريد المستخدم عند التسجيل" : "Email used for your registration"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/15"
                  dir="ltr"
                />
                <button disabled={working} className="m-btn m-btn-primary w-full justify-center disabled:opacity-60">
                  <Mail size={16} />
                  {isArabic ? "أرسل رابط الدخول" : "Send secure link"}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-800">{isArabic ? "تحديثات البريد" : "Email updates"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {isArabic ? "إشعارات عند نشر مرحلة أو تحديث جديد للفرصة." : "Notices when a new research stage or update is published."}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={inbox.preferences.emailEnabled}
                      onChange={(event) => void updateEmailPreference(event.target.checked)}
                      aria-label={isArabic ? "تفعيل تحديثات البريد" : "Enable email updates"}
                      disabled={working || !inbox.preferences.emailVerified}
                      className="h-5 w-5 accent-[#117b59]"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-black text-slate-800"><Smartphone size={16} />{isArabic ? "إشعارات الهاتف" : "Phone push"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {inbox.preferences.pushAvailable
                          ? isArabic ? "تظهر رسالة عامة دون عنوان البحث على شاشة القفل." : "Shows a generic message; no research title appears on the lock screen."
                          : isArabic ? "تحتاج إلى إعداد مفاتيح VAPID في Render أولاً." : "VAPID keys must be configured on Render first."}
                      </p>
                    </div>
                    {inbox.preferences.pushEnabled ? (
                      <button type="button" onClick={() => void disablePush()} disabled={working} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {isArabic ? "إيقاف" : "Turn off"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => void enablePush()} disabled={working || !inbox.preferences.pushAvailable} className="m-btn m-btn-primary m-btn-sm disabled:opacity-50">
                        {isArabic ? "تفعيل" : "Enable"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {inbox.pushDevices.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-black text-slate-800">{isArabic ? "الأجهزة المفعّلة" : "Enabled devices"}</h3>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {inbox.pushDevices.map((device) => (
                      <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{device.deviceLabel}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {isArabic ? "آخر تحديث: " : "Last updated: "}
                            {new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en", { dateStyle: "medium" }).format(new Date(device.updatedAt))}
                          </p>
                        </div>
                        <button type="button" onClick={() => void removeDevice(device.id)} disabled={working} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                          {isArabic ? "إزالة الجهاز" : "Remove device"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-800">
                  {isArabic ? "صندوق الإشعارات" : "Notification inbox"}
                  <span className="ms-2 text-sm font-bold text-slate-500">({inbox.notifications.length})</span>
                </h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void loadInbox()} className="m-btn m-btn-ghost m-btn-sm" aria-label={isArabic ? "تحديث القائمة" : "Refresh inbox"}>
                    <RefreshCw size={15} />{isArabic ? "تحديث" : "Refresh"}
                  </button>
                  <button type="button" onClick={() => void logout()} disabled={working} className="m-btn m-btn-ghost m-btn-sm">
                    <LogOut size={15} />{isArabic ? "خروج" : "Sign out"}
                  </button>
                </div>
              </div>

              {inbox.notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm leading-6 text-slate-500">
                  {isArabic ? "لا توجد تحديثات منشورة لفرصك البحثية حتى الآن." : "There are no published updates for your research opportunities yet."}
                </div>
              ) : (
                <div className="space-y-3">
                  {inbox.notifications.map((notification) => (
                    <article key={notification.id} className={`rounded-2xl border p-4 sm:p-5 ${notification.readAt ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/40"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex rounded-full bg-[#e6f5ef] px-3 py-1 text-xs font-black text-[#117b59]">
                            {(labels[notification.stage] || labels.general_update)[isArabic ? "ar" : "en"]}
                          </span>
                          <h3 className="mt-3 font-black leading-7 text-slate-800">{notification.title}</h3>
                        </div>
                        {!notification.readAt && (
                          <button type="button" onClick={() => void markRead(notification)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#117b59] hover:bg-emerald-100">
                            <Check size={14} />{isArabic ? "تمت القراءة" : "Mark read"}
                          </button>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{notification.message}</p>
                      <time className="mt-3 block text-xs font-medium text-slate-400" dateTime={notification.createdAt}>
                        {new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}
                      </time>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
