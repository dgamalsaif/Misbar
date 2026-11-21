/**
 * Read-time upgrade of shipped identity defaults only. Never replaces custom
 * branding, contact destinations, URLs, or opportunity data.
 */
export function migrateLegacySiteIdentity(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const brand = input.brand && typeof input.brand === "object" && !Array.isArray(input.brand)
    ? { ...input.brand as Record<string, unknown> } : {};
  const replacements: Record<string, Record<string, string>> = {
    siteNameAr: { "أكاديمية SRMA للأبحاث": "مسبار", "SRMA Research Academy": "مسبار" },
    siteNameEn: { "SRMA Research Academy": "Misbar" },
    appNameAr: { "أكاديمية SRMA للأبحاث": "مسبار" },
    appNameEn: { "SRMA Research Academy": "Misbar" },
    appShortName: { SRMA: "Misbar" },
    logoUrl: { "/srma-logo.jpg": "/misbar-logo.svg" },
    appIconUrl: { "/srma-logo.jpg": "/misbar-logo.svg" },
  };
  for (const [key, values] of Object.entries(replacements)) {
    const old = brand[key];
    if (typeof old === "string" && Object.hasOwn(values, old)) brand[key] = values[old];
  }
  const pages = input.pages && typeof input.pages === "object" && !Array.isArray(input.pages)
    ? { ...input.pages as Record<string, unknown> } : {};
  const pageChanges: Record<string, Record<string, [string, string]>> = {
    home: {
      titleAr: ["أكاديمية SRMA للأبحاث", "مسبار"],
      titleEn: ["SRMA Research Academy", "Misbar"],
    },
    about: {
      titleAr: ["عن الأكاديمية", "عن مسبار"],
      titleEn: ["About the Academy", "About Misbar"],
      descriptionAr: ["تعرف على رسالة وأهداف أكاديمية SRMA", "تعرف على رسالة وأهداف مسبار"],
      descriptionEn: ["Learn about SRMA Academy's mission and goals", "Learn about Misbar's mission and goals"],
    },
  };
  for (const [id, fields] of Object.entries(pageChanges)) {
    const page = pages[id];
    if (!page || typeof page !== "object" || Array.isArray(page)) continue;
    const next = { ...page as Record<string, unknown> };
    for (const [key, [old, replacement]] of Object.entries(fields)) {
      if (next[key] === old) next[key] = replacement;
    }
    pages[id] = next;
  }
  return { ...input, brand, pages };
}
