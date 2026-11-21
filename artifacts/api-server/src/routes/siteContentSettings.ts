import { raw, Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireOwner } from "../middlewares/coordinatorAuth";
import { getSiteContentSettings, sanitizeSiteContentSettings, saveSiteContentSettings, saveOpportunityInquirySettings } from "../lib/siteContentSettings";
import { INQUIRY_KEYS, validateInquiryPatch } from "../lib/opportunityInquiryPatch";
import { randomUUID } from "node:crypto";
import { siteShareImageSource, siteShareImageVersion, validateSocialShareImageUrl } from "../lib/siteShareImage";
import { validateExperienceSettings } from "../../../../lib/site-experience";
import { getResearchImageBytes, resolveResearchImageUploadToken, ResearchImageStorageError, ResearchImageValidationError, uploadResearchImage } from "../lib/researchImageStorage";

const router = Router();

const SITE_LOGO_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/x-png", "image/webp", "application/octet-stream"];

router.post("/site-brand-logo/upload", requireOwner, raw({ type: SITE_LOGO_IMAGE_TYPES, limit: "10mb" }), async (req, res): Promise<void> => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "اختر صورة شعار صالحة بصيغة PNG أو JPG أو WebP." });
    return;
  }
  try {
    const upload = await uploadResearchImage({ data: req.body, contentType: req.get("content-type") || "" });
    const objectPath = resolveResearchImageUploadToken(upload.imageToken);
    const imageId = objectPath.split("/").at(-1);
    if (!imageId) throw new ResearchImageValidationError("تعذر تجهيز رابط الشعار.");
    res.status(201).json({ logoUrl: `/api/site-brand-logo/${imageId}` });
  } catch (error) {
    if (error instanceof ResearchImageValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof ResearchImageStorageError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Failed to upload site brand logo");
    res.status(500).json({ error: "تعذر رفع الشعار. لم يتم تأكيد الرفع؛ أعد المحاولة." });
  }
});

router.get("/site-brand-logo/:imageId", async (req, res): Promise<void> => {
  const imageId = req.params.imageId;
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) {
    res.status(404).end();
    return;
  }
  try {
    const image = await getResearchImageBytes(`/objects/research-images/${imageId}`);
    if (!image) {
      res.status(404).end();
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(image.contentType).send(image.data);
  } catch {
    res.status(404).end();
  }
});

router.get("/site-content-settings", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await getSiteContentSettings());
});

router.get("/site-share-metadata", async (_req, res): Promise<void> => {
  const { brand } = await getSiteContentSettings();
  res.setHeader("Cache-Control", "no-store");
  res.json({ imagePath: `/api/site-share-image?v=${siteShareImageVersion(brand)}` });
});

router.get("/site-share-image", async (_req, res): Promise<void> => {
  const { brand } = await getSiteContentSettings();
  const source = siteShareImageSource(brand, _req.get("user-agent") || "");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "User-Agent");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (source.startsWith("/objects/")) {
    const image = await getResearchImageBytes(source);
    if (!image) { res.status(404).end(); return; }
    res.type(image.contentType).send(image.data);
    return;
  }
  // External images are redirected, never fetched server-side (no SSRF).
  if (source.startsWith("https://")) { res.redirect(302, source); return; }
  if (!["/srma-share-logo.gif", "/srma-share-logo.jpg", "/srma-logo.jpg"].includes(source)) {
    res.redirect(302, source);
    return;
  }
  const bytes = await loadPwaIconSource(source);
  res.type(path.extname(source.split("?")[0])).send(bytes);
});

router.post("/site-share-image/resolve-upload", requireOwner, (req, res): void => {
  try {
    res.json({ imagePath: resolveResearchImageUploadToken(req.body?.imageToken) });
  } catch {
    res.status(400).json({ error: "رمز الصورة غير صالح. أعد رفع الصورة." });
  }
});

router.get("/pwa-manifest", async (_req, res): Promise<void> => {
  const { brand, experience } = await getSiteContentSettings();
  const name = `${brand.appNameAr || brand.siteNameAr || "مسبار"} | ${brand.appNameEn || brand.siteNameEn || "Misbar"}`;
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.type("application/manifest+json").json({
    id: "/",
    name,
    short_name: brand.appShortName || "Misbar",
    description: `${brand.appNameAr || "مسبار"} — ${brand.appNameEn || "Misbar"}`,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: experience.theme.background,
    theme_color: brand.appThemeColor,
    lang: "ar",
    dir: "rtl",
    categories: ["education", "medical", "productivity"],
    icons: [
      { src: "/api/pwa-icon/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/pwa-icon/512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  });
});

router.get("/pwa-icon/:size.png", async (req, res): Promise<void> => {
  const size = Number(req.params.size);
  if (size !== 192 && size !== 512) {
    res.status(404).end();
    return;
  }
  const { brand } = await getSiteContentSettings();
  const source = await loadPwaIconSource(brand.appIconUrl || "/misbar-logo.svg")
    .catch(() => loadPwaIconSource("/misbar-logo.svg"));
  const inset = Math.round(size * 0.72);
  const logo = await sharp(source).resize(inset, inset, { fit: "contain" }).png().toBuffer();
  const output = await sharp({
    create: { width: size, height: size, channels: 4, background: brand.appThemeColor },
  }).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.type("image/png").send(output);
});

router.put("/site-content-settings", requireOwner, async (req, res): Promise<void> => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "إعدادات الموقع يجب أن تكون كائناً صالحاً." });
    return;
  }
  try {
    validateExperienceSettings(req.body.experience);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "إعدادات المظهر غير صالحة." });
    return;
  }
  let settings: ReturnType<typeof sanitizeSiteContentSettings>;
  try {
    const current = await getSiteContentSettings();
    settings = sanitizeSiteContentSettings({ ...current, ...req.body });
    const brandInput = req.body?.brand || {};
    if (brandInput.socialShareImageUrl !== undefined) {
      settings.brand.socialShareImageUrl = validateSocialShareImageUrl(brandInput.socialShareImageUrl);
      if (settings.brand.socialShareImageUrl.startsWith("/objects/")) {
        settings.brand.socialShareImageUrl = resolveResearchImageUploadToken(settings.brand.socialShareImageUrl);
      }
    }
    settings.brand.socialShareImageVersion = randomUUID();
    const existing = Object.fromEntries(INQUIRY_KEYS.filter(key => settings.brand[key] !== undefined).map(key => [key, settings.brand[key]]));
    const supplied = Object.fromEntries(INQUIRY_KEYS.filter(key => key in brandInput).map(key => [key, brandInput[key]]));
    validateInquiryPatch({ ...existing, ...supplied });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }
  try {
    await saveSiteContentSettings(settings);
    res.setHeader("Cache-Control", "no-store");
    res.json(settings);
  } catch (error) {
    req.log.error({ err: error }, "Could not save site settings");
    res.status(500).json({ error: "تعذر حفظ الإعدادات. لم يتم تأكيد الحفظ؛ أعد المحاولة." });
  }
});

router.patch("/site-content-settings/opportunity-inquiry", requireOwner, async (req, res): Promise<void> => {
  let patch: ReturnType<typeof validateInquiryPatch>;
  try {
    patch = validateInquiryPatch(req.body);
    const { brand } = await getSiteContentSettings();
    const existing = Object.fromEntries(INQUIRY_KEYS.filter(key => brand[key] !== undefined).map(key => [key, brand[key]]));
    validateInquiryPatch({ ...existing, ...patch });
  }
  catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
  res.json(await saveOpportunityInquirySettings(patch));
});

export default router;

async function loadPwaIconSource(iconUrl: string): Promise<Buffer> {
  if (iconUrl.startsWith("/")) {
    const publicRoots = [
      path.resolve(process.cwd(), "artifacts/rspf-academia/public"),
      path.resolve(process.cwd(), "../rspf-academia/public"),
    ];
    for (const publicRoot of publicRoots) {
      const filePath = path.resolve(publicRoot, `.${iconUrl}`);
      if (!filePath.startsWith(`${publicRoot}${path.sep}`)) continue;
      try {
        return await readFile(filePath);
      } catch {
        // Try the other supported workspace/deployment layout.
      }
    }
    throw new Error("App icon file is unavailable");
  }
  const response = await fetch(iconUrl, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Could not load app icon");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 5_000_000) throw new Error("App icon is too large");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5_000_000) throw new Error("App icon is too large");
  return bytes;
}