import { ResearchImageValidationError } from "./researchImageStorage";

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
