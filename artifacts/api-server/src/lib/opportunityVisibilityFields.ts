export const OPPORTUNITY_DISPLAY_FIELDS = [
  "title", "preview",
  "image", "code", "specialty", "country", "deadline", "status", "description", "price", "journal",
  "indexedIn", "duration", "supervisor", "createdAt", "seats", "benefits",
] as const;

export const DEFAULT_HIDDEN_OPPORTUNITY_FIELDS = ["title", "specialty", "preview"] as const;

export function validateHiddenFields(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > OPPORTUNITY_DISPLAY_FIELDS.length ||
      input.some(field => typeof field !== "string" ||
        !(OPPORTUNITY_DISPLAY_FIELDS as readonly string[]).includes(field))) {
    throw new Error("خيارات عرض معلومات الفرصة غير صحيحة.");
  }
  return [...new Set(input)];
}

export function validateIncludedServices(input: unknown): string[] {
  if (!Array.isArray(input) || input.length > 20 ||
      input.some((service) => typeof service !== "string" || service.length > 200)) {
    throw new Error("قائمة الخدمات المشمولة غير صحيحة.");
  }
  return [...new Set(input.map((service: string) => service.trim()).filter(Boolean))];
}