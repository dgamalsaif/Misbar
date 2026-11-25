import { useCallback, useEffect, useState } from "react";
import { Archive, Check, LoaderCircle, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";

type DuplicateOpportunity = {
  id: number;
  titleAr: string;
  titleEn: string;
  specialtyAr: string;
  specialtyEn: string;
  category: string;
  status: string;
  seatsLeft: number;
  totalSeats: number;
  isArchived: boolean;
  archivedAt: string | null;
  canonicalResearchId: number | null;
  registrationCount: number;
};

type DuplicateGroup = {
  key: string;
  activeCount: number;
  opportunities: DuplicateOpportunity[];
};

type DuplicateResponse = {
  archiveAvailable: boolean;
  groups: DuplicateGroup[];
  error?: string;
};

export default function DuplicateOpportunitiesPanel({
  onClose,
  onCatalogChanged,
}: {
  onClose: () => void;
  onCatalogChanged: () => void;
}) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [archiveAvailable, setArchiveAvailable] = useState(false);
  const [primaryIds, setPrimaryIds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/programs/duplicates");
      const payload = await response.json().catch(() => ({})) as DuplicateResponse;
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل قائمة الفرص المتشابهة.");
      setGroups(payload.groups || []);
      setArchiveAvailable(payload.archiveAvailable === true);
      setPrimaryIds((current) => {
        const next = { ...current };
        for (const group of payload.groups || []) {
          const exists = group.opportunities.some((item) => item.id === next[group.key] && !item.isArchived);
          if (!exists) {
            const onlyActive = group.opportunities.filter((item) => !item.isArchived);
            if (onlyActive.length === 1) next[group.key] = onlyActive[0]!.id;
            else delete next[group.key];
          }
        }
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateArchive = async (group: DuplicateGroup, item: DuplicateOpportunity) => {
    const archived = !item.isArchived;
    const canonicalId = primaryIds[group.key];
    const otherActive = group.opportunities.some((opportunity) => opportunity.id !== item.id && !opportunity.isArchived);
    if (archived && (!canonicalId || canonicalId === item.id)) {
      setError("اختر أولاً النسخة الأساسية التي ستبقى.");
      return;
    }
    if (archived && item.registrationCount > 0) {
      const confirmed = window.confirm(
        `هذه الفرصة مرتبطة بـ ${item.registrationCount} تسجيل. ستُخفى عن الفرص العامة وتُمنع التسجيلات الجديدة عليها، لكن الفرصة والتسجيلات والمقاعد المحجوزة لن تُحذف أو تتغير. هل تريد المتابعة؟`,
      );
      if (!confirmed) return;
    }
    const restoreAsDraft = !archived && otherActive;
    if (restoreAsDraft && !window.confirm(
      "توجد نسخة أخرى غير مؤرشفة مطابقة. ستُستعاد هذه الفرصة كمسودة خاصة بالإدارة حتى لا تظهر فرصتان متطابقتان. يمكنك مراجعتها ثم نشرها لاحقاً.",
    )) return;
    if (!archived && !otherActive && !window.confirm("هل تريد استعادة الفرصة إلى حالة ظهورها السابقة؟")) return;

    setBusyId(item.id);
    setError("");
    try {
      const response = await apiFetch(`/api/programs/${item.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archived,
          ...(archived ? { canonicalId } : {}),
          ...(restoreAsDraft ? { restoreAsDraft: true } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر تحديث حالة الأرشفة.");
      await refresh();
      onCatalogChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بالخادم.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#117b59]">
            <ShieldAlert size={22} />
            <span className="text-sm font-black">مراجعة آمنة</span>
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-900">الفرص المتشابهة والمكررة</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            تتم المطابقة بعد توحيد الحروف العربية والإنجليزية والمسافات. لا تُحذف أي فرصة أو تسجيل تلقائياً، ولا تتغير المقاعد عند الأرشفة.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">
            <RefreshCw size={16} /> تحديث
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">العودة للفرص</button>
        </div>
      </header>

      {!archiveAvailable && (
        <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          يمكن عرض التطابقات ومنع إضافة المكرر الآن، لكن الأرشفة والاستعادة تحتاجان تطبيق ترحيل قاعدة البيانات الإضافي قبل النشر.
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-slate-500"><LoaderCircle className="animate-spin" size={20} /> جارٍ فحص الفرص</div>
      ) : groups.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-800">
          لم يتم العثور على فرص لها عنوان وتخصص متطابقان.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <article key={group.key} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-slate-900">مجموعة تطابق · {group.opportunities.length} فرص</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${group.activeCount > 1 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {group.activeCount > 1 ? `${group.activeCount} نسخ غير مؤرشفة` : "تمت أرشفة النسخ الزائدة"}
                </span>
              </div>

              <div className="space-y-3">
                {group.opportunities.map((item) => {
                  const isPrimary = primaryIds[group.key] === item.id;
                  const isBusy = busyId === item.id;
                  return (
                    <div key={item.id} className={`rounded-xl border p-3 sm:p-4 ${item.isArchived ? "border-slate-200 bg-slate-50" : isPrimary ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-slate-500">#{item.id}</span>
                            {item.isArchived ? (
                              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-700">مؤرشفة</span>
                            ) : isPrimary ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800"><Check size={13} /> النسخة الأساسية</span>
                            ) : null}
                          </div>
                          <p className="mt-2 break-words text-sm font-black leading-6 text-slate-900">{item.titleAr || item.titleEn}</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">{item.specialtyAr || item.specialtyEn} · {item.status}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            المقاعد: {item.seatsLeft} من {item.totalSeats} · التسجيلات المحفوظة: {item.registrationCount}
                          </p>
                          {item.isArchived && item.archivedAt && (
                            <p className="mt-1 text-[11px] text-slate-500">تاريخ الأرشفة: {new Date(item.archivedAt).toLocaleDateString("ar-SA")}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {!item.isArchived && (
                            <button
                              type="button"
                              onClick={() => setPrimaryIds((current) => ({ ...current, [group.key]: item.id }))}
                              className={`rounded-lg px-3 py-2 text-xs font-black ${isPrimary ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}
                            >
                              {isPrimary ? "النسخة الأساسية" : "اعتمادها كأساسية"}
                            </button>
                          )}
                          {archiveAvailable && (item.isArchived ? (
                            <button type="button" onClick={() => void updateArchive(group, item)} disabled={isBusy} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50">
                              {isBusy ? <LoaderCircle className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                              استعادة
                            </button>
                          ) : !isPrimary && (
                            <button type="button" onClick={() => void updateArchive(group, item)} disabled={isBusy || !primaryIds[group.key]} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                              {isBusy ? <LoaderCircle className="animate-spin" size={14} /> : <Archive size={14} />}
                              أرشفة هذه النسخة
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
