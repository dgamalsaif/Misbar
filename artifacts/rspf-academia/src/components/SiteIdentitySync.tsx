import { useEffect } from "react";
import { useSiteContentSettings } from "@/hooks/use-site-content-settings";

/**
 * Keeps PWA manifest, touch icon, favicon and theme-color in sync with brand settings.
 * Deliberately does NOT touch document.title — PageSeo (SeoManager) is the single owner of the title.
 */
export default function SiteIdentitySync() {
  const { data: settings } = useSiteContentSettings();

  useEffect(() => {
    if (!settings) return;
    const { brand } = settings;
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) {
      const version = encodeURIComponent([
        brand.appNameAr, brand.appNameEn, brand.appShortName, brand.appIconUrl,
        brand.appThemeColor, settings.experience.theme.background,
      ].join("|"));
      manifest.href = `/api/pwa-manifest?v=${version}`;
    }
    const icon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (icon) icon.href = brand.appIconUrl || brand.logoUrl;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon && brand.appIconUrl) favicon.href = brand.appIconUrl;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (theme) theme.content = brand.appThemeColor;
  }, [settings]);

  return null;
}
