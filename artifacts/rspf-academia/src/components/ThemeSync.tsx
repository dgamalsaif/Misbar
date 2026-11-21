import { useEffect } from "react";
import { useExperience } from "@/hooks/use-site-content-settings";
import type { BodyFont, HeadingFont } from "../../../../lib/site-experience";

export const FONT_FAMILIES: Record<HeadingFont | BodyFont, { css: string; query: string; label: string }> = {
  readex: { css: "'Readex Pro'", query: "Readex+Pro:wght@400;500;600;700", label: "Readex Pro" },
  amiri: { css: "'Amiri'", query: "Amiri:wght@400;700", label: "Amiri (نسخ كلاسيكي)" },
  tajawal: { css: "'Tajawal'", query: "Tajawal:wght@400;500;700;800", label: "Tajawal" },
  ibmPlexArabic: { css: "'IBM Plex Sans Arabic'", query: "IBM+Plex+Sans+Arabic:wght@400;500;600;700", label: "IBM Plex Sans Arabic" },
  notoKufi: { css: "'Noto Kufi Arabic'", query: "Noto+Kufi+Arabic:wght@400;600;700", label: "Noto Kufi Arabic" },
  notoNaskh: { css: "'Noto Naskh Arabic'", query: "Noto+Naskh+Arabic:wght@400;600;700", label: "Noto Naskh Arabic" },
};

function hexToHsl(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const RADIUS = { sharp: "0.375rem", soft: "1rem", round: "1.5rem" } as const;
const BUTTON_RADIUS = { pill: "999px", rounded: "0.85rem", square: "0.3rem" } as const;
const DENSITY = { compact: "0.8", comfortable: "1", airy: "1.2" } as const;

/** Applies experience.theme to CSS custom properties on <html>. Covers public pages, portals, admin, and modals. */
export default function ThemeSync() {
  const { theme } = useExperience();

  useEffect(() => {
    const root = document.documentElement;
    const set = (k: string, v: string) => root.style.setProperty(k, v);
    set("--m-primary", theme.primary);
    set("--m-gold", theme.gold);
    set("--m-ink", theme.ink);
    set("--m-bg", theme.background);
    set("--m-surface", theme.surface);
    set("--primary", hexToHsl(theme.primary));
    set("--ring", hexToHsl(theme.primary));
    set("--background", hexToHsl(theme.background));
    set("--foreground", hexToHsl(theme.ink));
    set("--card", hexToHsl(theme.surface));
    set("--popover", hexToHsl(theme.surface));
    set("--card-foreground", hexToHsl(theme.ink));
    set("--popover-foreground", hexToHsl(theme.ink));
    set("--secondary-foreground", hexToHsl(theme.ink));
    set("--m-radius", RADIUS[theme.radius]);
    set("--radius", RADIUS[theme.radius]);
    set("--m-btn-radius", BUTTON_RADIUS[theme.buttonStyle]);
    set("--m-space", DENSITY[theme.density]);
    set("--m-font-heading", `${FONT_FAMILIES[theme.headingFont].css}, ${FONT_FAMILIES[theme.bodyFont].css}, serif`);
    set("--m-font-body", `${FONT_FAMILIES[theme.bodyFont].css}, 'Tajawal', sans-serif`);
    set("--m-heading-scale", String(theme.headingScale));
    root.style.fontSize = `${theme.baseFontSize}px`;
    root.dataset.cardStyle = theme.cardStyle;
    root.dataset.pattern = theme.backgroundPattern;
    root.dataset.motion = theme.motion ? "on" : "off";

    const href = `https://fonts.googleapis.com/css2?family=${FONT_FAMILIES[theme.headingFont].query}&family=${FONT_FAMILIES[theme.bodyFont].query}&display=swap`;
    let link = document.head.querySelector<HTMLLinkElement>("link[data-misbar-fonts]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.misbarFonts = "1";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [theme]);

  return null;
}
