import { createContext, useContext, useState, type ReactNode } from "react";
import type { SiteContentSettings } from "@/lib/siteContentSettings";

/**
 * In-memory, tab-local draft of site settings used for live preview before saving.
 * Never persisted (no storage, no network) and therefore never visible to other sessions.
 */
interface DraftCtx {
  draft: SiteContentSettings | null;
  setDraft: (value: SiteContentSettings | null) => void;
}

const Ctx = createContext<DraftCtx>({ draft: null, setDraft: () => undefined });

export function ExperienceDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SiteContentSettings | null>(null);
  return <Ctx.Provider value={{ draft, setDraft }}>{children}</Ctx.Provider>;
}

export function useExperienceDraft() {
  return useContext(Ctx);
}
