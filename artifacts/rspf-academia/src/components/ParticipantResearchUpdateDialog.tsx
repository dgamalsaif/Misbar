import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, LoaderCircle, RefreshCw, Send, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ResearchOpportunity } from "@/lib/researchData";

type EventSummary = {
  id: number;
  opportunityId: number;
  idempotencyKey: string;
  stage: string;
  title: string;
  message: string;
  status: "pending" | "processing" | "completed" | "failed" | "unknown" | "skipped";
  totalRecipients: number;
  emailQueued: number;
  pushQueued: number;
  sent: number;
  failed: number;
  unknown: number;
  skipped: number;
  emailAvailable: boolean;
  pushAvailable: boolean;
  lastError: string;
  createdAt: string;
};

const stages = [
  ["general_update", "تحديث عام"],
  ["seats_full", "اكتملت المقاعد"],
  ["ethics_approved", "موافقة أخلاقية / PROSPERO"],
  ["submitted", "تم الرفع في المجلة"],
  ["under_review", "قيد مراجعة المجلة"],
  ["accepted", "مقبولة"],
  ["published", "تم النشر"],
  ["completed", "اكتمل البحث"],
] as const;

const statusLabels: Record<EventSummary["status"], string> = {
  pending: "بانتظار الإرسال",
  processing: "جارٍ الإرسال",
  completed: "اكتمل الإرسال",
  failed: "تعذر بعض الإرسال",
  unknown: "نتيجة غير مؤكدة",
  skipped: "لم توجد وسيلة مفعلة",
};

function makeIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
}

function apiError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "error" in data && typeof data.error === "string"
    ? data.error
    : fallback;
}

export default function ParticipantResearchUpdateDialog({
  research,
  onClose,
}: {
  research: ResearchOpportunity;
  onClose: () => void;
}) {
  const initialStage = stages.some(([value]) => value === research.status) ? research.status : "general_update";
  const [stage, setStage] = useState<string>(initialStage);
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EventSummary | null>(null);
  const selectedStage = useMemo(() => stages.find(([value]) => value === stage)?.[1] || stages[0][1], [stage]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/admin/programs/${research.id}/participant-notifications`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل سجل الإشعارات."));
      setEvents(Array.isArray(data.events) ? data.events as EventSummary[] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل سجل الإشعارات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadEvents(); }, [research.id]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working || !message.trim()) return;
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`/api/admin/programs/${research.id}/participant-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, stage, message: message.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(data, "تعذر نشر تحديث المشاركين."));
      const event = data as EventSummary;
      setResult(event);
      setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 10));
      setMessage("");
      setIdempotencyKey(makeIdempotencyKey());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر نشر تحديث المشاركين.");
    } finally {
      setWorking(false);
    }
  };

  const retry = async (eventId: number) => {
    setWorking(true);
    setError("");
    try {
      const response = await apiFetch(`/api/admin/participant-notifications/${eventId}/retry`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(data, "تعذرت إعادة المحاولة."));
      setResult(null);
      await loadEvents();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذرت إعادة المحاولة.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="participant-update-title" dir="rtl" className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 id="participant-update-title" className="flex items-center gap-2 text-lg font-black text-slate-800 sm:text-xl">
              <Bell size={20} className="text-[#117b59]" />
              إشعار المشاركين بتحديث البحث
            </h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{research.titleEn || research.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            سيصل التحديث بالبريد إلى المشاركين غير المرفوضين، ويظهر في صندوق إشعاراتهم. يصل إشعار الهاتف فقط لمن فعّله. شاشة القفل تعرض تنبيهاً عاماً بلا عنوان البحث.
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
          {result && (
            <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-black"><CheckCircle2 size={17} />تم حفظ التحديث وإضافته إلى قائمة الإرسال.</p>
              <p className="mt-2 leading-6">
                المشاركون: {result.totalRecipients} · البريد في قائمة الإرسال: {result.emailQueued} · إشعارات الهاتف: {result.pushQueued}
              </p>
              {!result.emailAvailable && <p className="mt-1 text-xs">البريد غير مهيأ على الخادم؛ لم تُضف رسائل البريد لقائمة الإرسال.</p>}
              {!result.pushAvailable && <p className="mt-1 text-xs">إشعارات الهاتف غير مهيأة على Render؛ تبقى إشعارات البريد والصندوق الداخلي متاحة.</p>}
            </div>
          )}

          <form onSubmit={publish} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div>
              <label htmlFor="participant-update-stage" className="mb-1.5 block text-sm font-bold text-slate-700">مرحلة البحث</label>
              <select id="participant-update-stage" value={stage} onChange={(event) => setStage(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117b59]">
                {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="participant-update-message" className="mb-1.5 block text-sm font-bold text-slate-700">رسالة التحديث للمشاركين</label>
              <textarea
                id="participant-update-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                minLength={1}
                maxLength={1500}
                rows={4}
                placeholder={`اكتب ما تم إنجازه في مرحلة "${selectedStage}" أو الخطوة التالية...`}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#117b59]"
              />
              <p className="mt-1 text-left text-xs text-slate-400">{message.length}/1500</p>
            </div>
            <button type="submit" disabled={working || !message.trim()} className="m-btn m-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
              {working ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              نشر التحديث للمشاركين
            </button>
            <p className="text-xs leading-5 text-slate-500">
              لا يرسل النظام رسالة عند تعديل بيانات الفرصة تلقائياً؛ النشر هنا إجراء منفصل ومقصود حتى لا تصل تحديثات غير مكتملة.
            </p>
          </form>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-800">سجل التحديثات الأخيرة</h3>
              <button type="button" onClick={() => void loadEvents()} disabled={loading || working} className="m-btn m-btn-ghost m-btn-sm">
                <RefreshCw size={14} /> تحديث السجل
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" />جارٍ التحميل...</div>
            ) : events.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">لم يُنشر أي تحديث للمشاركين لهذه الفرصة بعد.</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <article key={event.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800">{stages.find(([value]) => value === event.stage)?.[1] || "تحديث بحثي"} · {statusLabels[event.status] || event.status}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}
                          {" · "}المشاركون: {event.totalRecipients}{" · "}تم: {event.sent}{" · "}فشل مؤكد: {event.failed}{" · "}غير مؤكد: {event.unknown}
                        </p>
                      </div>
                      {event.failed > 0 && (
                        <button type="button" onClick={() => void retry(event.id)} disabled={working} className="m-btn m-btn-ghost m-btn-sm text-[#117b59] disabled:opacity-50">
                          <RefreshCw size={14} />إعادة الفاشل المؤكد
                        </button>
                      )}
                    </div>
                    {event.lastError && event.status !== "completed" && <p className="mt-2 text-xs leading-5 text-amber-800">{event.lastError}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
