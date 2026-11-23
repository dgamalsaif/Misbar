import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Instagram,
  Loader2,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import {
  getListProgramSocialPostsQueryKey,
  getListSocialConnectionsQueryKey,
  useConnectTelegramChannel,
  useDisconnectSocialConnection,
  useGetProgramSocialPreview,
  useListProgramSocialPosts,
  useListSocialConnections,
  usePublishProgramToSocialAccounts,
  useRetrySocialPost,
  useStartMetaSocialAuthorization,
  useStartXSocialAuthorization,
} from "@workspace/api-client-react";
import type {
  PublishSocialPostResult,
  SocialConnection,
} from "@workspace/api-client-react";
import type { ResearchOpportunity } from "@/lib/researchData";

type Props = {
  opportunity: ResearchOpportunity;
  onClose: () => void;
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X / Twitter",
  telegram: "Telegram",
};

const PLATFORM_ICONS: Record<string, typeof Share2> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Share2,
  telegram: Send,
};

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "تعذر إكمال العملية. تحقق من الاتصال والإعدادات ثم حاول مجدداً.";
}

function AccountRow({
  connection,
  selected,
  onToggle,
  onDisconnect,
  onReauthorize,
  busy,
}: {
  connection: SocialConnection;
  selected: boolean;
  onToggle: () => void;
  onDisconnect: () => void;
  onReauthorize: (platform: string) => void;
  busy: boolean;
}) {
  const Icon = PLATFORM_ICONS[connection.platform] || Share2;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3" data-testid={`social-account-${connection.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        {connection.status === "active" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`اختيار ${connection.accountName} للنشر`}
            data-testid={`checkbox-social-account-${connection.id}`}
            className="h-4 w-4 accent-[#117b59]"
          />
        )}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#117b59]">
          <Icon size={18} />
        </span>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-black text-slate-800">{connection.accountName}</p>
          <p className={`mt-0.5 text-[11px] font-bold ${connection.status === "active" ? "text-emerald-700" : "text-amber-700"}`}>
            {PLATFORM_LABELS[connection.platform] || connection.platform}
            {connection.needsReauthorization ? " · يحتاج إعادة ربط" : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {connection.needsReauthorization && (connection.platform === "facebook" || connection.platform === "instagram") && (
          <button type="button" onClick={() => onReauthorize(connection.platform)} className="rounded-lg px-2 py-1 text-xs font-bold text-[#117b59] hover:bg-emerald-50" data-testid={`button-reauthorize-${connection.id}`}>
            إعادة ربط
          </button>
        )}
        {connection.needsReauthorization && connection.platform === "x" && (
          <button type="button" onClick={() => onReauthorize(connection.platform)} className="rounded-lg px-2 py-1 text-xs font-bold text-[#117b59] hover:bg-emerald-50" data-testid={`button-reauthorize-${connection.id}`}>
            إعادة ربط
          </button>
        )}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={busy}
          title="فصل الحساب ومسح بيانات التفويض"
          aria-label={`فصل ${connection.accountName}`}
          data-testid={`button-disconnect-${connection.id}`}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function SocialPublishingDialog({ opportunity, onClose }: Props) {
  const queryClient = useQueryClient();
  const initializedSelection = useRef(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [operationResults, setOperationResults] = useState<PublishSocialPostResult[]>([]);

  const connectionsQuery = useListSocialConnections();
  const previewQuery = useGetProgramSocialPreview(opportunity.id);
  const postsQuery = useListProgramSocialPosts(opportunity.id);
  const connectTelegram = useConnectTelegramChannel();
  const disconnectConnection = useDisconnectSocialConnection();
  const startMeta = useStartMetaSocialAuthorization();
  const startX = useStartXSocialAuthorization();
  const publish = usePublishProgramToSocialAccounts();
  const retry = useRetrySocialPost();
  const connections = connectionsQuery.data?.connections || [];
  const activeConnections = connections.filter((connection) => connection.status === "active");

  useEffect(() => {
    if (connectionsQuery.data && !initializedSelection.current) {
      initializedSelection.current = true;
      setSelectedIds(connectionsQuery.data.connections
        .filter((connection) => connection.status === "active")
        .map((connection) => connection.id));
    }
  }, [connectionsQuery.data]);

  const invalidateSocialData = () => {
    void queryClient.invalidateQueries({ queryKey: getListSocialConnectionsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListProgramSocialPostsQueryKey(opportunity.id) });
  };

  const connectMeta = async () => {
    setNotice("");
    try {
      const result = await startMeta.mutateAsync(undefined);
      window.location.assign(result.authorizeUrl);
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const connectX = async () => {
    setNotice("");
    try {
      const result = await startX.mutateAsync(undefined);
      window.location.assign(result.authorizeUrl);
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const saveTelegram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    try {
      await connectTelegram.mutateAsync({ data: { botToken, chatId } });
      setBotToken("");
      setChatId("");
      setNotice("تم التحقق من البوت وصلاحياته وربط القناة.");
      setNoticeError(false);
      invalidateSocialData();
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const handleDisconnect = async (connection: SocialConnection) => {
    if (!window.confirm(`هل تريد فصل ${connection.accountName} ومسح بيانات تفويضه؟`)) return;
    try {
      await disconnectConnection.mutateAsync({ id: connection.id });
      setSelectedIds((ids) => ids.filter((id) => id !== connection.id));
      invalidateSocialData();
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const handlePublish = async () => {
    setNotice("");
    setOperationResults([]);
    try {
      const result = await publish.mutateAsync({
        id: opportunity.id,
        data: { connectionIds: selectedIds },
      });
      setOperationResults(result.results);
      setNotice(result.message);
      setNoticeError(result.results.some((item) => item.post?.status === "failed" || item.post?.status === "unknown"));
      invalidateSocialData();
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const handleRetry = async (postId: number) => {
    setNotice("");
    try {
      const result = await retry.mutateAsync({ id: postId });
      setOperationResults([result]);
      setNotice(result.message);
      setNoticeError(result.post?.status === "failed" || result.post?.status === "unknown");
      invalidateSocialData();
    } catch (error) {
      setNotice(messageFromError(error));
      setNoticeError(true);
    }
  };

  const startBusy = startMeta.isPending || startX.isPending;
  const busy = connectTelegram.isPending || disconnectConnection.isPending || publish.isPending || retry.isPending;
  const history = postsQuery.data?.posts || [];
  const getError = (value: unknown) => value instanceof Error ? value.message : "تعذر تحميل البيانات.";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="social-publishing-title" dir="rtl" data-testid="dialog-social-publishing">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0 text-right">
            <div className="flex items-center gap-2 text-[#117b59]">
              <Share2 size={18} />
              <span className="text-xs font-black uppercase tracking-wide">النشر اليدوي</span>
            </div>
            <h2 id="social-publishing-title" className="mt-1 truncate text-lg font-black text-slate-900">نشر الفرصة على وسائل التواصل</h2>
            <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500" dir="ltr">{opportunity.titleEn || opportunity.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" data-testid="button-close-social-publishing" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-800">معاينة المحتوى الذي سيُنشر</h3>
              {previewQuery.data?.titleVisible ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">العنوان ظاهر حسب إعداد الفرصة</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">العنوان والتخصص مخفيان</span>
              )}
            </div>
            {previewQuery.isLoading ? (
              <div className="flex items-center gap-2 py-5 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> جارٍ إعداد المعاينة الآمنة…</div>
            ) : previewQuery.isError ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{getError(previewQuery.error)}</p>
            ) : previewQuery.data ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-right text-sm leading-7 text-slate-700" data-testid="text-social-preview">{previewQuery.data.text}</pre>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={previewQuery.data.imageUrl} alt="معاينة صورة النشر" className="aspect-[1.9/1] w-full object-cover" data-testid="img-social-preview" />
                  <a href={previewQuery.data.shareUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 border-t border-slate-200 bg-white p-2 text-xs font-bold text-[#117b59]" data-testid="link-social-preview">
                    فتح صفحة الفرصة <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-800">الحسابات المرتبطة</h3>
              <span className="text-[11px] font-bold text-slate-500">لا يتم النشر إلا بعد ضغط زر النشر</span>
            </div>
            {connectionsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> جارٍ تحميل الحسابات…</div>
            ) : connectionsQuery.isError ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{getError(connectionsQuery.error)}</p>
            ) : connections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">لم تُربط حسابات بعد. اربط Facebook وInstagram عبر Meta أو X عبر التفويض الرسمي. Telegram يحتاج رمز بوت وقناة يملك البوت فيها صلاحية النشر.</p>
            ) : (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <AccountRow
                    key={connection.id}
                    connection={connection}
                    selected={selectedIds.includes(connection.id)}
                    onToggle={() => setSelectedIds((ids) => ids.includes(connection.id) ? ids.filter((id) => id !== connection.id) : [...ids, connection.id])}
                    onDisconnect={() => void handleDisconnect(connection)}
                    onReauthorize={(platform) => void (platform === "x" ? connectX() : connectMeta())}
                    busy={busy}
                  />
                ))}
              </div>
            )}
            {connectionsQuery.data && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void connectMeta()} disabled={startBusy || !connectionsQuery.data.encryptionConfigured || !connectionsQuery.data.providers.meta} data-testid="button-connect-meta" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {startMeta.isPending ? <Loader2 size={15} className="animate-spin" /> : <Facebook size={15} className="text-blue-600" />}
                  ربط Facebook وInstagram
                </button>
                <button type="button" onClick={() => void connectX()} disabled={startBusy || !connectionsQuery.data.encryptionConfigured || !connectionsQuery.data.providers.x} data-testid="button-connect-x" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {startX.isPending ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                  ربط حساب X / Twitter
                </button>
              </div>
            )}
            {connectionsQuery.data && (!connectionsQuery.data.encryptionConfigured || !connectionsQuery.data.providers.meta || !connectionsQuery.data.providers.x) && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900" data-testid="text-social-server-setup">
                {connectionsQuery.data.encryptionConfigured
                  ? "يلزم إعداد تطبيقات Meta وX ومفاتيحها في متغيرات خدمة srma-api على Render قبل الربط."
                  : "يلزم إضافة SOCIAL_CREDENTIALS_ENCRYPTION_KEY إلى خدمة srma-api على Render قبل حفظ أي بيانات تفويض."}
              </p>
            )}
          </section>

          <details className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <summary className="cursor-pointer text-sm font-black text-slate-800" data-testid="summary-telegram-setup">إعداد Telegram</summary>
            <form onSubmit={(event) => void saveTelegram(event)} className="mt-4 space-y-3">
              <p className="text-xs leading-5 text-slate-600">أضف البوت إلى قناة Telegram كمشرف مع صلاحية إرسال الرسائل. يُتحقق من الرمز والصلاحية فوراً، ثم يُحفظ الرمز مشفراً في قاعدة بيانات Render ولا يُعرض مرة أخرى.</p>
              <label className="block text-xs font-bold text-slate-700">
                رمز البوت من BotFather
                <input
                  type="password"
                  autoComplete="new-password"
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                  minLength={20}
                  maxLength={300}
                  required
                  data-testid="input-telegram-bot-token"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left text-sm font-medium outline-none focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/10"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                معرّف القناة أو اسمها العام مثل @misbar_channel
                <input
                  type="text"
                  value={chatId}
                  onChange={(event) => setChatId(event.target.value)}
                  minLength={2}
                  maxLength={150}
                  required
                  placeholder="@misbar_channel أو -1001234567890"
                  dir="ltr"
                  data-testid="input-telegram-chat-id"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-left text-sm font-medium outline-none focus:border-[#117b59] focus:ring-2 focus:ring-[#117b59]/10"
                />
              </label>
              <button type="submit" disabled={connectTelegram.isPending || !botToken || !chatId || !connectionsQuery.data?.encryptionConfigured} data-testid="button-save-telegram" className="flex items-center gap-2 rounded-xl bg-[#117b59] px-4 py-2.5 text-xs font-black text-white hover:bg-[#0c6549] disabled:opacity-50">
                {connectTelegram.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                تحقق واربط القناة
              </button>
            </form>
          </details>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">نشر هذه الفرصة</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">اختر الحسابات المطلوبة؛ يحتفظ النظام بحالة كل حساب ويمنع تكرار المنشور بعد نجاحه.</p>
              </div>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={busy || previewQuery.isLoading || !previewQuery.data || selectedIds.length === 0}
                data-testid="button-publish-social"
                className="flex items-center gap-2 rounded-xl bg-[#117b59] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-[#0c6549] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publish.isPending ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                نشر الآن
              </button>
            </div>
            {selectedIds.length === 0 && activeConnections.length > 0 && <p className="mt-3 text-xs font-bold text-amber-800">حدد حساباً واحداً على الأقل.</p>}
            {operationResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {operationResults.map((result, index) => (
                  <div key={`${result.connectionId}-${index}`} className={`rounded-xl border p-3 text-xs ${result.post?.status === "published" ? "border-emerald-200 bg-white text-emerald-900" : "border-amber-200 bg-white text-amber-900"}`} data-testid={`status-social-result-${result.connectionId}`}>
                    <p className="font-black">{PLATFORM_LABELS[result.platform] || result.platform} · {result.accountName}</p>
                    <p className="mt-1 leading-5">{result.message}</p>
                  </div>
                ))}
              </div>
            )}
            {notice && (
              <p className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs font-bold leading-5 ${noticeError ? "bg-red-50 text-red-800" : "bg-white text-emerald-800"}`} role="status" data-testid="status-social-notice">
                {noticeError ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
                {notice}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-black text-slate-800">سجل النشر</h3>
            {postsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> جارٍ تحميل السجل…</div>
            ) : postsQuery.isError ? (
              <p className="text-sm text-red-700">{getError(postsQuery.error)}</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500">لم تُنشر هذه الفرصة بعد.</p>
            ) : (
              <div className="space-y-2">
                {history.map((post) => (
                  <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3" data-testid={`row-social-post-${post.id}`}>
                    <div>
                      <p className="text-xs font-black text-slate-800">{PLATFORM_LABELS[post.platform] || post.platform} · {post.accountName}</p>
                      <p className={`mt-1 text-[11px] font-bold ${post.status === "published" ? "text-emerald-700" : post.status === "unknown" ? "text-amber-800" : "text-slate-600"}`}>{post.statusLabel}</p>
                      {post.lastError && <p className="mt-1 max-w-xl text-[11px] leading-5 text-red-700">{post.lastError}</p>}
                    </div>
                    {post.status === "failed" && (
                      <button type="button" onClick={() => void handleRetry(post.id)} disabled={busy} data-testid={`button-retry-social-post-${post.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#117b59] hover:bg-emerald-50 disabled:opacity-50">
                        إعادة المحاولة
                      </button>
                    )}
                    {post.status === "unknown" && (
                      <span className="max-w-52 text-[10px] leading-4 text-amber-800">تحقق من الحساب قبل إعادة النشر لتجنب التكرار.</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="text-[11px] leading-5 text-slate-500">
            يتطلب Instagram حساباً احترافياً مرتبطاً بصفحة Facebook وصورة يمكن الوصول إليها علناً. قد يتطلب X / Twitter تفعيل صلاحية النشر في خطة المطور. لا تُرسل العناوين أو الصور التي أخفاها المالك.
          </p>
        </div>
      </div>
    </div>
  );
}
