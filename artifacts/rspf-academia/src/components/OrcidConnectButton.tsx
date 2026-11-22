import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type ConnectionStatus = "" | "connecting" | "linked" | "cancelled" | "not-configured" | "failed" | "closed" | "blocked" | "production-only";

interface OrcidPopupMessage {
  type: "misbar-orcid-auth";
  status: "linked" | "cancelled" | "error";
  orcidId?: string;
  reason?: string;
}

interface OrcidConnectButtonProps {
  onLinked: (orcidId: string) => void;
}

const ORCID_ID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

export default function OrcidConnectButton({ onLinked }: OrcidConnectButtonProps) {
  const { localize } = useLanguage();
  const [status, setStatus] = useState<ConnectionStatus>("");
  const popup = useRef<Window | null>(null);
  const onLinkedRef = useRef(onLinked);

  useEffect(() => {
    onLinkedRef.current = onLinked;
  }, [onLinked]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== popup.current) return;
      if (!event.data || typeof event.data !== "object") return;
      const message = event.data as Partial<OrcidPopupMessage>;
      if (message.type !== "misbar-orcid-auth") return;

      popup.current = null;
      if (message.status === "linked" && typeof message.orcidId === "string" && ORCID_ID_PATTERN.test(message.orcidId)) {
        onLinkedRef.current(message.orcidId);
        setStatus("linked");
      } else if (message.status === "cancelled") {
        setStatus("cancelled");
      } else if (message.reason === "not_configured") {
        setStatus("not-configured");
      } else {
        setStatus("failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (status !== "connecting") return;
    const timer = window.setInterval(() => {
      if (popup.current?.closed) {
        popup.current = null;
        setStatus("closed");
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [status]);

  const connect = () => {
    setStatus("");
    if (!["srmaacademy.com", "www.srmaacademy.com"].includes(window.location.hostname)) {
      setStatus("production-only");
      return;
    }
    const opened = window.open(
      "/api/orcid/start",
      "misbar-orcid-connect",
      "popup,width=520,height=720,resizable,scrollbars",
    );
    if (!opened) {
      setStatus("blocked");
      return;
    }
    popup.current = opened;
    setStatus("connecting");
  };

  const message = {
    linked: localize("تم جلب معرّف ORCID وإضافته إلى التسجيل.", "ORCID iD added to this registration."),
    cancelled: localize("أُلغي الربط. يمكنك إدخال المعرّف يدويًا.", "Authorization was cancelled. You can enter the iD manually."),
    "not-configured": localize("الربط التلقائي غير مهيأ بعد. يمكنك إدخال المعرّف يدويًا.", "Automatic linking is not configured yet. You can enter the iD manually."),
    failed: localize("تعذر إكمال ربط ORCID. حاول مرة أخرى أو أدخل المعرّف يدويًا.", "ORCID linking failed. Try again or enter the iD manually."),
    closed: localize("أُغلقت نافذة ORCID قبل اكتمال الربط.", "The ORCID window closed before linking finished."),
    blocked: localize("يرجى السماح بالنوافذ المنبثقة لربط ORCID.", "Allow pop-ups to connect ORCID."),
    "production-only": localize("اربط ORCID من موقع مسبار المنشور.", "Connect ORCID from the published Misbar site."),
  } as const;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={connect}
        disabled={status === "connecting"}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
      >
        {status === "connecting" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}
        {status === "connecting"
          ? localize("بانتظار ORCID…", "Waiting for ORCID…")
          : localize("ربط معرّف ORCID", "Connect ORCID iD")}
      </button>
      <a
        href="https://orcid.org/register"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
      >
        {localize("إنشاء حساب ORCID", "Create an ORCID account")}
      </a>
      {status && status !== "connecting" && (
        <span role="status" className={`basis-full text-xs ${status === "linked" ? "text-emerald-700" : "text-slate-500"}`}>
          {message[status]}
        </span>
      )}
    </div>
  );
}
