import type { ResearchProgram } from "@workspace/db";

type SocialOpportunityInput = Pick<
  ResearchProgram,
  "id" | "titleEn" | "specialtyEn" | "imagePath"
> & {
  hiddenFields: string[];
  siteImageUrl?: string;
  seatUpdate?: {
    seatsLeft: number;
    totalSeats: number;
    firstAuthorSeatsLeft: number;
    coAuthorSeatsLeft: number;
  };
};

export type SocialPostContent = {
  text: string;
  shareUrl: string;
  imageUrl: string;
  titleVisible: boolean;
  specialtyVisible: boolean;
  opportunityImageVisible: boolean;
};

function publicOrigin() {
  const configured = process.env["PUBLIC_SITE_ORIGIN"]?.trim();
  const origin = configured || "https://srmaacademy.com";
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error();
    }
    return parsed.origin;
  } catch {
    throw new Error("The public website address is not configured safely.");
  }
}

function safeSiteImage(siteImageUrl: string | undefined, origin: string) {
  if (!siteImageUrl) return `${origin}/api/site-share-image`;
  try {
    const parsed = new URL(siteImageUrl, origin);
    if (parsed.protocol !== "https:" || parsed.origin !== origin ||
        parsed.username || parsed.password) return `${origin}/api/site-share-image`;
    return parsed.toString();
  } catch {
    return `${origin}/api/site-share-image`;
  }
}

export function buildSocialPostContent(opportunity: SocialOpportunityInput): SocialPostContent {
  const hidden = new Set(opportunity.hiddenFields);
  const titleVisible = !hidden.has("title") && !hidden.has("preview");
  const specialtyVisible = titleVisible && !hidden.has("specialty");
  const opportunityImageVisible = titleVisible && !hidden.has("image") && Boolean(opportunity.imagePath);
  const origin = publicOrigin();
  const shareUrl = `${origin}/share/research/${opportunity.id}`;
  // Keep seat-update copy conservative enough for X while still including a safe link.
  const title = titleVisible ? opportunity.titleEn.trim().slice(0, opportunity.seatUpdate ? 40 : 70) : "";
  const specialty = specialtyVisible ? opportunity.specialtyEn.trim().slice(0, opportunity.seatUpdate ? 15 : 30) : "";
  const lines = ["فرصة بحثية جديدة", ...(title ? [title] : [])];
  if (specialty) lines.push(`التخصص: ${specialty}`);
  if (opportunity.seatUpdate) {
    const seats = opportunity.seatUpdate;
    lines.push(seats.seatsLeft > 0
      ? `المقاعد المتبقية: ${seats.seatsLeft} من ${seats.totalSeats}`
      : "اكتملت المقاعد البحثية");
    lines.push(`كاتب أول: ${seats.firstAuthorSeatsLeft} | مؤلف مشارك: ${seats.coAuthorSeatsLeft}`);
  }
  lines.push(`التسجيل: ${shareUrl}`);

  return {
    text: lines.join("\n"),
    shareUrl,
    imageUrl: opportunityImageVisible
      ? `${origin}/api/programs/${opportunity.id}/image`
      : safeSiteImage(opportunity.siteImageUrl, origin),
    titleVisible,
    specialtyVisible,
    opportunityImageVisible,
  };
}
