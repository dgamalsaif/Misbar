import { useQuery } from "@tanstack/react-query";
import { DEFAULT_SITE_CONTENT_SETTINGS, normalizeSiteContentSettings, type SiteContentSettings } from "@/lib/siteContentSettings";
import { apiFetch } from "@/lib/api";
import { useExperienceDraft } from "@/lib/experience-draft";

export function useSiteContentSettings() {
  const { draft } = useExperienceDraft();
  const query = useQuery<SiteContentSettings>({
    queryKey: ["site-content-settings"],
    queryFn: async () => {
      const response = await apiFetch("/api/site-content-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch site content settings");
      }
      return normalizeSiteContentSettings(await response.json());
    },
    initialData: { ...DEFAULT_SITE_CONTENT_SETTINGS, showOpportunityDetails: false },
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });
  // Owner live preview: an unsaved, tab-local draft overrides rendering without touching the cache.
  if (draft) return { ...query, data: draft, isDraft: true as const };
  return { ...query, isDraft: false as const };
}

export function useExperience() {
  return useSiteContentSettings().data.experience;
}
