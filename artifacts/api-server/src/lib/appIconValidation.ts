import { ResearchImageValidationError } from "./researchImageStorage";
import sharp from "sharp";

export function validateAppIconMetadata(metadata: {
  format?: string;
  width?: number;
  height?: number;
}): void {
  const { format, width, height } = metadata;
  if (!["jpeg", "png", "webp"].includes(format || "")) {
    throw new ResearchImageValidationError("أيقونة التطبيق يجب أن تكون JPG أو PNG أو WebP.");
  }
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    (width ?? 0) < 96 ||
    (height ?? 0) < 96 ||
    (width ?? Infinity) > 4096 ||
    (height ?? Infinity) > 4096
  ) {
    throw new ResearchImageValidationError("أبعاد الأيقونة يجب أن تكون بين 96 و4096 بكسل.");
  }
}

export async function validateAppIconImageBytes(data: Buffer): Promise<void> {
  const invalidImage = () => new ResearchImageValidationError(
    "تعذر تحميل صورة أيقونة التطبيق أو أن الرابط لا يعرض صورة صالحة. صحح الرابط أو ارفع صورة صالحة.",
  );
  if (!data.length || data.length > 5_000_000) throw invalidImage();
  try {
    const image = sharp(data, { limitInputPixels: 16_777_216 });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp", "svg", "gif"].includes(metadata.format || "") ||
      !Number.isInteger(metadata.width) ||
      !Number.isInteger(metadata.height) ||
      (metadata.width ?? 0) < 1 ||
      (metadata.height ?? 0) < 1 ||
      (metadata.width ?? Infinity) > 4096 ||
      (metadata.height ?? Infinity) > 4096
    ) {
      throw invalidImage();
    }
    await image.resize(1, 1, { fit: "inside" }).png().toBuffer();
  } catch {
    throw invalidImage();
  }
}

export function validateAppIconUrl(candidate: unknown): string {
  if (typeof candidate !== "string" || candidate.length > 1000) {
    throw new Error("رابط أيقونة التطبيق غير صالح. استخدم رابط HTTPS من موقع مسبار أو مساراً داخلياً.");
  }
  const value = candidate.trim();
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.split(/[/?#]/).includes("..") &&
    !/[\u0000-\u0020]/.test(value)
  ) {
    return value;
  }
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      (hostname === "srmaacademy.com" || hostname === "www.srmaacademy.com")
    ) {
      return parsed.toString();
    }
  } catch {
    // Report a consistent validation message below.
  }
  throw new Error("رابط أيقونة التطبيق غير صالح. استخدم رابط HTTPS من موقع مسبار أو مساراً داخلياً.");
}
