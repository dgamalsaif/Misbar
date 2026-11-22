export function normalizeOrcidId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value
    .trim()
    .replace(/^https?:\/\/orcid\.org\//i, "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
  if (!/^\d{15}[\dX]$/.test(compact)) return null;

  let checksum = 0;
  for (const digit of compact.slice(0, 15)) {
    checksum = (checksum + Number(digit)) * 2;
  }
  const checkValue = (12 - (checksum % 11)) % 11;
  const expectedCheckDigit = checkValue === 10 ? "X" : String(checkValue);
  if (compact[15] !== expectedCheckDigit) return null;

  return compact.match(/.{4}/g)?.join("-") ?? null;
}
