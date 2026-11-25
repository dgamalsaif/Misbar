export interface InvoiceShareDetails {
  invoiceNumber: string;
  participant: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    affiliation: string;
    specialization: string;
  };
  researchId: number;
  researchTitle: string;
  showResearchReference: boolean;
  showFeeDetails: boolean;
  showSeatDetails: boolean;
  totalSeats?: number;
  remainingSeats?: number;
  targetJournal?: string;
  specialty?: string;
  priceOriginalSar?: number;
  priceDiscountedSar?: number;
  includedServices?: string[];
  authorRole?: string;
  language: string;
}

export function formatInvoiceNumber(numberPrefix: string, createdAt: string, registrationId: number) {
  const date = new Date(createdAt);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  return `${numberPrefix || "MIS"}-${year}-${String(registrationId).padStart(6, "0")}`;
}

export function buildInvoiceShareMessage(details: InvoiceShareDetails) {
  const english = details.language === "en";
  const money = (value?: number) => Number.isFinite(value)
    ? new Intl.NumberFormat(english ? "en-SA" : "ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value!)
    : "";
  const rows = [
    details.participant.fullName && `${english ? "Participant" : "المشارك"}: ${details.participant.fullName}`,
    details.participant.email && `${english ? "Email" : "البريد الإلكتروني"}: ${details.participant.email}`,
    details.participant.phone && `${english ? "WhatsApp" : "رقم التواصل"}: ${details.participant.phone}`,
    details.participant.country && `${english ? "Country" : "الدولة"}: ${details.participant.country}`,
    details.participant.city && `${english ? "City" : "المدينة"}: ${details.participant.city}`,
    details.participant.affiliation && `${english ? "Affiliation" : "جهة الانتساب"}: ${details.participant.affiliation}`,
    details.participant.specialization && `${english ? "Participant specialty" : "تخصص المشارك"}: ${details.participant.specialization}`,
    details.authorRole && `${english ? "Author role" : "دور التأليف"}: ${details.authorRole}`,
    details.showResearchReference && `${english ? "Opportunity no." : "رقم الفرصة"}: ${details.researchId}`,
    `${english ? "Research opportunity" : "عنوان الفرصة البحثية"}: ${details.researchTitle}`,
    details.specialty && `${english ? "Research specialty" : "تخصص البحث"}: ${details.specialty}`,
    details.targetJournal && `${english ? "Target journal" : "المجلة المستهدفة"}: ${details.targetJournal}`,
    details.showSeatDetails && typeof details.remainingSeats === "number" && typeof details.totalSeats === "number"
      ? `${english ? "Seats remaining" : "المقاعد المتبقية"}: ${details.remainingSeats} / ${details.totalSeats}`
      : details.showSeatDetails && typeof details.remainingSeats === "number"
        ? `${english ? "Seats remaining" : "المقاعد المتبقية"}: ${details.remainingSeats}`
        : "",
    details.showFeeDetails && typeof details.priceOriginalSar === "number"
      ? `${english ? "Fee before discount" : "الرسوم قبل الخصم"}: ${money(details.priceOriginalSar)}`
      : "",
    details.showFeeDetails && typeof details.priceOriginalSar === "number" && typeof details.priceDiscountedSar === "number" && details.priceOriginalSar > details.priceDiscountedSar
      ? `${english ? "Discount" : "الخصم"}: ${money(details.priceOriginalSar - details.priceDiscountedSar)}`
      : "",
    details.showFeeDetails && typeof details.priceDiscountedSar === "number"
      ? `${english ? "Amount due — unpaid" : "المبلغ المطلوب — غير مدفوع"}: ${money(details.priceDiscountedSar)}`
      : details.showFeeDetails && typeof details.priceOriginalSar === "number"
        ? `${english ? "Amount due — unpaid" : "المبلغ المطلوب — غير مدفوع"}: ${money(details.priceOriginalSar)}`
        : "",
    details.showFeeDetails && details.includedServices?.length
      ? `${english ? "Included services" : "الخدمات المشمولة"}: ${details.includedServices.join("، ")}`
      : "",
  ].filter((row): row is string => !!row);

  return [
    english ? "Research participation invoice — unpaid" : "فاتورة مشاركة بحثية — غير مدفوعة",
    `${english ? "Invoice no." : "رقم الفاتورة"}: ${details.invoiceNumber}`,
    ...rows,
  ].join("\n");
}

function inlineComputedStyles(source: Element, clone: Element) {
  const computed = window.getComputedStyle(source);
  const style = (clone as HTMLElement | SVGElement).style;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  sourceChildren.forEach((child, index) => {
    const cloneChild = cloneChildren[index];
    if (cloneChild) inlineComputedStyles(child, cloneChild);
  });
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read image"));
    reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (!image.src || image.src.startsWith("data:")) return;
    try {
      const response = await fetch(image.src, { credentials: "include" });
      if (!response.ok) throw new Error("Image request failed");
      image.src = await blobAsDataUrl(await response.blob());
    } catch {
      // Keep same-origin or cache-backed URLs when the fetch cannot inline them.
    }
    try { await image.decode(); } catch { /* The browser can still render a late-loading image in the SVG. */ }
  }));
}

function imageFromSvg(svg: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(svg);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to render invoice preview")); };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create invoice image")), "image/jpeg", 0.94);
  });
}

function concatenate(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function createSinglePagePdfFromJpeg(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  if (!jpegBytes.length || imageWidth <= 0 || imageHeight <= 0) throw new Error("Invalid invoice image");
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 14;
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const content = encoder.encode(`q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/InvoiceImage Do\nQ\n`);
  const objects: Uint8Array[] = [
    encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /InvoiceImage 4 0 R >> >> /Contents 5 0 R >>`),
    concatenate([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
      jpegBytes,
      encoder.encode("\nendstream"),
    ]),
    concatenate([encoder.encode(`<< /Length ${content.length} >>\nstream\n`), content, encoder.encode("endstream")]),
  ];

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n")];
  const offsets = [0];
  let currentOffset = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(currentOffset);
    const header = encoder.encode(`${index + 1} 0 obj\n`);
    const footer = encoder.encode("\nendobj\n");
    parts.push(header, object, footer);
    currentOffset += header.length + object.length + footer.length;
  });
  const xrefOffset = currentOffset;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");
  parts.push(encoder.encode(xref));
  return new Blob([concatenate(parts)], { type: "application/pdf" });
}

export async function createInvoicePdfFile(invoiceElement: HTMLElement, fileName: string) {
  await document.fonts?.ready;
  const width = Math.ceil(invoiceElement.getBoundingClientRect().width);
  const rootRect = invoiceElement.getBoundingClientRect();
  const bottomActions = Array.from(invoiceElement.querySelectorAll(".invoice-screen-actions"))
    .find((element) => element.querySelector('[data-testid="button-save-invoice-pdf"]'));
  const trailingActionsHeight = bottomActions
    ? Math.max(0, rootRect.bottom - bottomActions.getBoundingClientRect().top)
    : 0;
  const height = Math.ceil(invoiceElement.scrollHeight - trailingActionsHeight);
  if (width <= 0 || height <= 0) throw new Error("Invoice is not ready to export");

  const clone = invoiceElement.cloneNode(true) as HTMLElement;
  inlineComputedStyles(invoiceElement, clone);
  clone.querySelectorAll(".invoice-screen-actions").forEach((element) => element.remove());
  clone.style.setProperty("width", `${width}px`);
  clone.style.setProperty("max-width", "none");
  clone.style.setProperty("height", "auto");
  clone.style.setProperty("margin", "0");
  clone.style.setProperty("box-shadow", "none");
  await inlineImages(clone);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = "hidden";
  wrapper.appendChild(clone);
  const svg = new Blob([
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="100%" height="100%">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`,
  ], { type: "image/svg+xml;charset=utf-8" });
  const image = await imageFromSvg(svg);
  const pixelRatio = Math.min(2.5, Math.max(1.5, window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(pixelRatio, pixelRatio);
  context.drawImage(image, 0, 0, width, height);
  const jpegBlob = await canvasToJpeg(canvas);
  const pdfBlob = createSinglePagePdfFromJpeg(new Uint8Array(await jpegBlob.arrayBuffer()), canvas.width, canvas.height);
  return new File([pdfBlob], fileName, { type: "application/pdf" });
}
