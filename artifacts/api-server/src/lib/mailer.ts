import nodemailer from "nodemailer";
import { logger } from "./logger";

const NOTIFY_EMAIL = process.env["ADMIN_NOTIFICATION_EMAIL"]?.trim() || "";
const FROM_EMAIL = process.env["SMTP_FROM"]?.trim() || "noreply@srma-research-academy.com";

function createTransport() {
  if (process.env["SMTP_HOST"]) {
    return nodemailer.createTransport({
      host: process.env["SMTP_HOST"],
      port: Number(process.env["SMTP_PORT"] || 587),
      secure: process.env["SMTP_SECURE"] === "true",
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
      auth: {
        user: process.env["SMTP_USER"],
        pass: process.env["SMTP_PASS"],
      },
    });
  }
  return null;
}

export function isRegistrationEmailConfigured() {
  return Boolean(process.env["SMTP_HOST"]);
}

export function renderParticipantUpdateEmail(data: {
  title: string;
  stageLabel: string;
  message: string;
  inboxUrl: string;
  unsubscribeUrl: string;
}) {
  const title = escapeHtml(data.title);
  const stageLabel = escapeHtml(data.stageLabel);
  const message = escapeHtml(data.message).replace(/\r?\n/g, "<br>");
  const inboxUrl = escapeHtml(data.inboxUrl);
  const unsubscribeUrl = escapeHtml(data.unsubscribeUrl);
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#14231f;line-height:1.9">
      <div style="background:#0C3156;color:#fff;padding:22px 24px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:20px">تحديث جديد لبحثك — مسبار</h1>
      </div>
      <div style="padding:22px 24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <p style="margin:0 0 10px;color:#117b59;font-weight:bold">${stageLabel}</p>
        <h2 style="font-size:17px;line-height:1.7;margin:0 0 14px">${title}</h2>
        <p style="margin:0 0 20px;white-space:normal">${message}</p>
        <a href="${inboxUrl}" style="display:inline-block;background:#117b59;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">فتح صندوق الإشعارات</a>
        <p style="margin:22px 0 0;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
          وصلك هذا التحديث لأن بريدك مسجل في هذه الفرصة البحثية.
          <a href="${unsubscribeUrl}" style="color:#475569">إيقاف رسائل تحديثات البحث</a>
        </p>
      </div>
    </div>`;
}

export async function sendParticipantNotificationAccessEmail(data: {
  email: string;
  accessUrl: string;
}) {
  const transport = createTransport();
  if (!transport) throw new Error("إعداد البريد غير مكتمل على خادم الإنتاج.");
  await transport.sendMail({
    from: { name: "Misbar | مسبار", address: FROM_EMAIL },
    to: data.email,
    subject: "رابط الدخول الآمن إلى إشعارات مسبار",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#14231f;line-height:1.9">
        <div style="background:#0C3156;color:#fff;padding:22px;border-radius:10px 10px 0 0">
          <h1 style="margin:0;font-size:20px">صندوق إشعارات مسبار</h1>
        </div>
        <div style="padding:22px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px">
          <p>استخدم الرابط التالي لفتح إشعارات الأبحاث المرتبطة ببريدك الإلكتروني. الرابط صالح لمدة 24 ساعة ويُستخدم مرة واحدة.</p>
          <p><a href="${escapeHtml(data.accessUrl)}" style="display:inline-block;background:#117b59;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">فتح صندوق الإشعارات</a></p>
          <p style="font-size:12px;color:#64748b">إذا لم تطلب هذا الرابط، يمكنك تجاهل الرسالة.</p>
        </div>
      </div>`,
  });
}

export async function sendParticipantUpdateEmail(data: {
  email: string;
  title: string;
  stageLabel: string;
  message: string;
  inboxUrl: string;
  unsubscribeUrl: string;
}) {
  const transport = createTransport();
  if (!transport) throw new Error("SMTP is not configured.");
  const result = await transport.sendMail({
    from: { name: "Misbar | مسبار", address: FROM_EMAIL },
    to: data.email,
    subject: `تحديث بحثي: ${data.stageLabel} — مسبار`,
    html: renderParticipantUpdateEmail(data),
  });
  if (result.rejected?.some((address) => address.toLowerCase() === data.email.toLowerCase())) {
    throw new Error("رفض خادم البريد استلام رسالة التحديث.");
  }
  if (Array.isArray(result.accepted) && result.accepted.length === 0) {
    throw new Error("لم يؤكد خادم البريد قبول رسالة التحديث.");
  }
}

export interface RegistrationEmailResult {
  configured: boolean;
  pending: boolean;
  adminSent: boolean;
  studentSent: boolean;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendRegistrationEmail(data: {
  fullName: string;
  specialization: string;
  email: string;
  whatsapp: string;
  affiliation: string;
  country: string;
  city: string;
  orcid: string;
  researchTitle: string;
}): Promise<RegistrationEmailResult> {
  const transport = createTransport();
  if (!transport) {
    logger.info("SMTP not configured — skipping email notification");
    return { configured: false, pending: false, adminSent: false, studentSent: false };
  }

  const fullName = escapeHtml(data.fullName);
  const specialization = escapeHtml(data.specialization);
  const email = escapeHtml(data.email);
  const whatsapp = escapeHtml(data.whatsapp);
  const affiliation = escapeHtml(data.affiliation);
  const country = escapeHtml(data.country);
  const city = escapeHtml(data.city);
  const orcid = escapeHtml(data.orcid);
  const researchTitle = escapeHtml(data.researchTitle);
  const whatsappRow = data.whatsapp
    ? `<tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">واتساب:</td><td style="padding:8px;">${whatsapp}</td></tr>`
    : "";
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0C3156; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin:0;">🔬 تسجيل جديد في فرصة بحثية — مسبار</h2>
      </div>
      <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">الاسم الكامل:</td><td style="padding:8px;">${fullName}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">التخصص:</td><td style="padding:8px;">${specialization}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">البريد الإلكتروني:</td><td style="padding:8px;">${email}</td></tr>
          ${whatsappRow}
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">جهة الانتساب:</td><td style="padding:8px;">${affiliation}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">الدولة / المدينة:</td><td style="padding:8px;">${country} — ${city || "—"}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">ORCID:</td><td style="padding:8px;">${orcid || "—"}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">الفرصة البحثية:</td><td style="padding:8px;">${researchTitle}</td></tr>
        </table>
        <div style="margin-top:16px; padding:12px; background:#EFF6FF; border-radius:6px; font-size:12px; color:#64748b;">
          تم الإرسال تلقائياً من منصة مسبار
        </div>
      </div>
    </div>
  `;

  let adminSent = false;
  let studentSent = false;
  if (NOTIFY_EMAIL) {
    try {
      await transport.sendMail({
        from: { name: "Misbar | مسبار", address: FROM_EMAIL },
        to: NOTIFY_EMAIL,
        subject: `[Misbar] تسجيل جديد — ${data.fullName} — ${data.researchTitle.substring(0, 50)}`,
        html,
      });
      adminSent = true;
    } catch (err) {
      logger.warn({ err }, "Failed to send admin registration email");
    }
  } else {
    logger.info("ADMIN_NOTIFICATION_EMAIL not set — skipping admin notification");
  }

  try {
    await transport.sendMail({
      from: { name: "Misbar | مسبار", address: FROM_EMAIL },
      to: data.email,
      subject: `تم استلام تسجيلك في ${data.researchTitle} — مسبار`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0C3156;color:#fff;padding:22px;border-radius:10px 10px 0 0;">
            <h2 style="margin:0;">تم استلام تسجيلك بنجاح</h2>
          </div>
          <div style="padding:22px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;color:#334155;line-height:1.9;">
            <p>مرحباً ${fullName}،</p>
            <p>نؤكد استلام تسجيلك في الفرصة البحثية التالية:</p>
            <p style="padding:12px;background:#f3fbf8;border-radius:8px;font-weight:bold;color:#117b59;">${researchTitle}</p>
            <p>سيتم التواصل معك من فريق مسبار بعد مراجعة بياناتك.</p>
          </div>
        </div>`,
    });
    studentSent = true;
  } catch (err) {
    logger.warn({ err }, "Failed to send student registration email");
  }
  if (adminSent && studentSent) logger.info({ to: NOTIFY_EMAIL }, "Registration emails sent");
  return { configured: true, pending: false, adminSent, studentSent };
}

export async function sendServiceRequestEmail(data: {
  fullName: string;
  phone: string;
  email: string;
  serviceType: string;
  details: string;
  fileLink: string;
}) {
  const transport = createTransport();
  if (!transport) {
    logger.info("SMTP not configured — skipping service request email");
    return;
  }

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #E9A020; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin:0;">📤 طلب خدمة جديد — مسبار</h2>
      </div>
      <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">الاسم الكامل:</td><td style="padding:8px;">${data.fullName}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">الجوال:</td><td style="padding:8px;">${data.phone}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">البريد الإلكتروني:</td><td style="padding:8px;">${data.email}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">نوع الخدمة:</td><td style="padding:8px;">${data.serviceType}</td></tr>
          <tr><td style="padding:8px; font-weight:bold; color:#0C3156;">تفاصيل الطلب:</td><td style="padding:8px;">${data.details}</td></tr>
          <tr style="background:#fff;"><td style="padding:8px; font-weight:bold; color:#0C3156;">رابط الملفات:</td><td style="padding:8px;">${data.fileLink || "—"}</td></tr>
        </table>
      </div>
    </div>
  `;

  if (!NOTIFY_EMAIL) {
    logger.info("ADMIN_NOTIFICATION_EMAIL not set — skipping service request admin email");
    return;
  }

  try {
    await transport.sendMail({
        from: { name: "Misbar | مسبار", address: FROM_EMAIL },
      to: NOTIFY_EMAIL,
      subject: `[Misbar] طلب خدمة — ${data.serviceType} — ${data.fullName}`,
      html,
    });
    logger.info({ to: NOTIFY_EMAIL }, "Service request email sent");
  } catch (err) {
    logger.warn({ err }, "Failed to send service request email");
  }
}
