import { Router, type NextFunction, type Request, type Response } from "express";
import {
  db,
  participantNotificationAccessTokensTable,
  participantNotificationPreferencesTable,
  registrationsTable,
} from "@workspace/db";
import {
  GetParticipantNotificationPushConfigResponse,
  ListParticipantNotificationsResponse,
  MarkParticipantNotificationReadParams,
  EndParticipantNotificationSessionResponse,
  RemoveParticipantPushDeviceParams,
  RemoveParticipantPushDeviceResponse,
  RemoveParticipantPushSubscriptionBody,
  RequestParticipantNotificationAccessBody,
  RequestParticipantNotificationAccessResponse,
  SaveParticipantPushSubscriptionBody,
  UnsubscribeParticipantEmailNotificationsResponse,
  UnsubscribeParticipantEmailNotificationsBody,
  UpdateParticipantNotificationPreferencesBody,
  VerifyParticipantNotificationAccessResponse,
  VerifyParticipantNotificationAccessBody,
} from "@workspace/api-zod";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  ACCESS_LINK_COOLDOWN_MS,
  ACCESS_TOKEN_TTL_MS,
  PARTICIPANT_NOTIFICATION_COOKIE,
  SESSION_TOKEN_TTL_MS,
  buildPublicSiteUrl,
  createOpaqueNotificationToken,
  hashNotificationToken,
  isSupportedWebPushEndpoint,
  normalizeNotificationEmail,
} from "../lib/participantNotificationSecurity";
import {
  getParticipantInbox,
  getParticipantPushConfig,
  markParticipantNotificationRead,
  removeParticipantPushDevice,
  removeParticipantPushSubscription,
  saveParticipantPushSubscription,
  updateParticipantEmailPreference,
} from "../lib/participantNotificationService";
import { isRegistrationEmailConfigured, sendParticipantNotificationAccessEmail } from "../lib/mailer";

const router = Router();
const ACCESS_RATE_WINDOW_MS = 10 * 60 * 1000;
const ACCESS_RATE_LIMIT = 6;
const accessAttempts = new Map<string, { count: number; resetAt: number }>();

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function participantEmail(req: Request) {
  const rawToken = req.cookies?.[PARTICIPANT_NOTIFICATION_COOKIE];
  if (typeof rawToken !== "string" || rawToken.length < 32 || rawToken.length > 128) return null;
  return hashNotificationToken(rawToken);
}

async function requireParticipantSession(req: Request, res: Response, next: NextFunction) {
  const tokenHash = participantEmail(req);
  if (!tokenHash) {
    res.status(401).json({ error: "افتح رابط التحقق المرسل إلى بريدك أولاً." });
    return;
  }
  const [session] = await db.select({
    email: participantNotificationAccessTokensTable.email,
  }).from(participantNotificationAccessTokensTable).where(and(
    eq(participantNotificationAccessTokensTable.tokenHash, tokenHash),
    eq(participantNotificationAccessTokensTable.purpose, "session"),
    isNull(participantNotificationAccessTokensTable.consumedAt),
    gt(participantNotificationAccessTokensTable.expiresAt, new Date()),
  )).limit(1);
  if (!session) {
    res.clearCookie(PARTICIPANT_NOTIFICATION_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.status(401).json({ error: "انتهت جلسة صندوق الإشعارات. اطلب رابط دخول جديداً." });
    return;
  }
  res.locals.participantEmail = session.email;
  next();
}

function accessRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  if (accessAttempts.size > 10_000) {
    for (const [ip, bucket] of accessAttempts) if (bucket.resetAt <= now) accessAttempts.delete(ip);
  }
  let bucket = accessAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + ACCESS_RATE_WINDOW_MS };
    accessAttempts.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > ACCESS_RATE_LIMIT) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: "طلبات كثيرة. انتظر قليلاً ثم أعد المحاولة." });
    return;
  }
  next();
}

function tokenUrl(path: string, token: string) {
  const url = new URL(buildPublicSiteUrl(path));
  url.searchParams.set("token", token);
  return url.toString();
}

function serializeInbox(inbox: Awaited<ReturnType<typeof getParticipantInbox>>) {
  return {
    ...inbox,
    notifications: inbox.notifications.map((notification) => ({
      id: notification.id,
      opportunityId: notification.opportunityId,
      stage: notification.stage,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
    })),
    pushDevices: inbox.pushDevices.map((device) => ({
      ...device,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    })),
  };
}

function deviceLabelFromUserAgent(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/CriOS|Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "متصفح";
}

router.get("/participant/notifications/push-config", (_req, res): void => {
  noStore(res);
  const config = getParticipantPushConfig();
  res.json(GetParticipantNotificationPushConfigResponse.parse({
    enabled: config.enabled,
    publicKey: config.enabled ? config.publicKey : null,
  }));
});

router.post("/participant/notifications/access-link", accessRateLimit, async (req, res): Promise<void> => {
  const parsed = RequestParticipantNotificationAccessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "أدخل بريداً إلكترونياً صحيحاً." });
    return;
  }
  if (!isRegistrationEmailConfigured()) {
    res.status(503).json({ error: "خدمة البريد غير جاهزة حالياً. حاول لاحقاً." });
    return;
  }

  const email = normalizeNotificationEmail(parsed.data.email);
  const [registration] = await db.select({ id: registrationsTable.id })
    .from(registrationsTable)
    .where(sql`lower(btrim(${registrationsTable.email})) = ${email}`)
    .limit(1);
  if (!registration) {
    res.status(202).json(RequestParticipantNotificationAccessResponse.parse({
      message: "إذا كان البريد مرتبطاً بتسجيل، فسيصلك رابط دخول آمن قريباً.",
    }));
    return;
  }

  const rawToken = createOpaqueNotificationToken();
  const now = new Date();
  const tokenCreated = await db.transaction(async (tx) => {
    await tx.insert(participantNotificationPreferencesTable).values({ email })
      .onConflictDoNothing({ target: participantNotificationPreferencesTable.email });
    const [preferences] = await tx.select().from(participantNotificationPreferencesTable)
      .where(eq(participantNotificationPreferencesTable.email, email))
      .for("update")
      .limit(1);
    if (
      preferences?.lastAccessLinkSentAt &&
      now.getTime() - preferences.lastAccessLinkSentAt.getTime() < ACCESS_LINK_COOLDOWN_MS
    ) return false;
    await tx.update(participantNotificationPreferencesTable).set({
      lastAccessLinkSentAt: now,
      updatedAt: now,
    }).where(eq(participantNotificationPreferencesTable.email, email));
    await tx.insert(participantNotificationAccessTokensTable).values({
      email,
      tokenHash: hashNotificationToken(rawToken),
      purpose: "access",
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
    });
    return true;
  });

  if (!tokenCreated) {
    res.status(202).json(RequestParticipantNotificationAccessResponse.parse({
      message: "إذا كان البريد مرتبطاً بتسجيل، فسيصلك رابط دخول آمن قريباً.",
    }));
    return;
  }

  try {
    await sendParticipantNotificationAccessEmail({
      email,
      accessUrl: tokenUrl("/notifications/verify", rawToken),
    });
    res.status(202).json(RequestParticipantNotificationAccessResponse.parse({
      message: "إذا كان البريد مرتبطاً بتسجيل، فسيصلك رابط دخول آمن قريباً.",
    }));
  } catch (error) {
    await db.update(participantNotificationAccessTokensTable).set({ consumedAt: new Date() })
      .where(eq(participantNotificationAccessTokensTable.tokenHash, hashNotificationToken(rawToken)));
    req.log.warn({ err: error }, "Could not send participant notification access link");
    res.status(503).json({ error: "تعذر إرسال الرابط الآن. حاول مرة أخرى بعد قليل." });
  }
});

router.post("/participant/notifications/verify", async (req, res): Promise<void> => {
  const parsed = VerifyParticipantNotificationAccessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "رابط الدخول غير صالح أو منتهي." });
    return;
  }

  const sessionToken = createOpaqueNotificationToken();
  const now = new Date();
  const verified = await db.transaction(async (tx) => {
    const [accessToken] = await tx.select().from(participantNotificationAccessTokensTable).where(and(
      eq(participantNotificationAccessTokensTable.tokenHash, hashNotificationToken(parsed.data.token)),
      eq(participantNotificationAccessTokensTable.purpose, "access"),
      isNull(participantNotificationAccessTokensTable.consumedAt),
      gt(participantNotificationAccessTokensTable.expiresAt, now),
    )).for("update").limit(1);
    if (!accessToken) return null;

    await tx.update(participantNotificationAccessTokensTable).set({ consumedAt: now })
      .where(eq(participantNotificationAccessTokensTable.id, accessToken.id));
    await tx.insert(participantNotificationPreferencesTable).values({
      email: accessToken.email,
      emailVerifiedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: participantNotificationPreferencesTable.email,
      set: { emailVerifiedAt: now, updatedAt: now },
    });
    await tx.insert(participantNotificationAccessTokensTable).values({
      email: accessToken.email,
      tokenHash: hashNotificationToken(sessionToken),
      purpose: "session",
      expiresAt: new Date(now.getTime() + SESSION_TOKEN_TTL_MS),
    });
    return { email: accessToken.email };
  });

  if (!verified) {
    res.status(400).json({ error: "رابط الدخول غير صالح أو منتهي أو استُخدم من قبل." });
    return;
  }
  noStore(res);
  res.cookie(PARTICIPANT_NOTIFICATION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TOKEN_TTL_MS,
    path: "/",
  });
  res.json(VerifyParticipantNotificationAccessResponse.parse({ email: verified.email }));
});

router.get("/participant/notifications", requireParticipantSession, async (_req, res): Promise<void> => {
  noStore(res);
  const inbox = await getParticipantInbox(res.locals.participantEmail as string);
  res.json(ListParticipantNotificationsResponse.parse(serializeInbox(inbox)));
});

router.patch("/participant/notifications/:id/read", requireParticipantSession, async (req, res): Promise<void> => {
  const params = MarkParticipantNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "رقم الإشعار غير صحيح." });
    return;
  }
  const notification = await markParticipantNotificationRead(
    res.locals.participantEmail as string,
    params.data.id,
  );
  if (!notification) {
    res.status(404).json({ error: "الإشعار غير موجود في صندوقك." });
    return;
  }
  noStore(res);
  res.json({
    id: notification.id,
    opportunityId: notification.opportunityId,
    stage: notification.stage,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  });
});

router.patch("/participant/notifications/preferences", requireParticipantSession, async (req, res): Promise<void> => {
  const parsed = UpdateParticipantNotificationPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "تفضيلات البريد غير صالحة." });
    return;
  }
  const email = res.locals.participantEmail as string;
  const preferences = await updateParticipantEmailPreference(email, parsed.data.emailEnabled);
  noStore(res);
  res.json({
    emailEnabled: preferences.emailEnabled,
    emailVerified: Boolean(preferences.emailVerifiedAt),
    pushEnabled: preferences.pushEnabled,
    pushAvailable: getParticipantPushConfig().enabled,
  });
});

router.post("/participant/notifications/push-subscriptions", requireParticipantSession, async (req, res): Promise<void> => {
  const parsed = SaveParticipantPushSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات إشعار المتصفح غير صالحة." });
    return;
  }
  const config = getParticipantPushConfig();
  if (!config.enabled) {
    res.status(503).json({ error: "إشعارات الهاتف لم تُفعّل بعد على خادم Render." });
    return;
  }
  let endpoint: URL;
  try {
    endpoint = new URL(parsed.data.endpoint);
  } catch {
    res.status(400).json({ error: "عنوان إشعار المتصفح غير صالح." });
    return;
  }
  if (!isSupportedWebPushEndpoint(endpoint.toString())) {
    res.status(400).json({ error: "عنوان إشعار المتصفح يجب أن يكون من مزود Web Push موثوق عبر HTTPS." });
    return;
  }

  const result = await saveParticipantPushSubscription(res.locals.participantEmail as string, {
    endpoint: endpoint.toString(),
    deviceLabel: deviceLabelFromUserAgent(req.get("user-agent") || ""),
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.message });
    return;
  }
  const inbox = await getParticipantInbox(res.locals.participantEmail as string);
  noStore(res);
  res.status(201).json(inbox.preferences);
});

router.post("/participant/notifications/push-subscriptions/remove", requireParticipantSession, async (req, res): Promise<void> => {
  const parsed = RemoveParticipantPushSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "عنوان إشعار المتصفح غير صالح." });
    return;
  }
  if (!isSupportedWebPushEndpoint(parsed.data.endpoint)) {
    res.status(400).json({ error: "عنوان إشعار المتصفح يجب أن يكون من مزود Web Push موثوق عبر HTTPS." });
    return;
  }
  const preferences = await removeParticipantPushSubscription(
    res.locals.participantEmail as string,
    parsed.data.endpoint,
  );
  const inbox = await getParticipantInbox(res.locals.participantEmail as string);
  noStore(res);
  res.json({
    emailEnabled: preferences?.emailEnabled ?? inbox.preferences.emailEnabled,
    emailVerified: Boolean(preferences?.emailVerifiedAt),
    pushEnabled: preferences?.pushEnabled ?? false,
    pushAvailable: inbox.preferences.pushAvailable,
  });
});

router.delete("/participant/notifications/push-subscriptions/:id", requireParticipantSession, async (req, res): Promise<void> => {
  const params = RemoveParticipantPushDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "رقم الجهاز غير صحيح." });
    return;
  }
  const inbox = await removeParticipantPushDevice(res.locals.participantEmail as string, params.data.id);
  if (!inbox) {
    res.status(404).json({ error: "الجهاز غير موجود ضمن اشتراكات إشعاراتك." });
    return;
  }
  noStore(res);
  res.json(RemoveParticipantPushDeviceResponse.parse(serializeInbox(inbox)));
});

router.post("/participant/notifications/unsubscribe", async (req, res): Promise<void> => {
  const parsed = UnsubscribeParticipantEmailNotificationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "رابط إيقاف البريد غير صالح." });
    return;
  }
  const now = new Date();
  const tokenHash = hashNotificationToken(parsed.data.token);
  const result = await db.transaction(async (tx) => {
    const [token] = await tx.select().from(participantNotificationAccessTokensTable).where(and(
      eq(participantNotificationAccessTokensTable.tokenHash, tokenHash),
      eq(participantNotificationAccessTokensTable.purpose, "unsubscribe"),
      isNull(participantNotificationAccessTokensTable.consumedAt),
      gt(participantNotificationAccessTokensTable.expiresAt, now),
    )).for("update").limit(1);
    if (!token) return false;
    await tx.update(participantNotificationAccessTokensTable).set({ consumedAt: now })
      .where(eq(participantNotificationAccessTokensTable.id, token.id));
    await tx.update(participantNotificationPreferencesTable).set({
      emailEnabled: false,
      updatedAt: now,
    }).where(eq(participantNotificationPreferencesTable.email, token.email));
    return true;
  });
  if (!result) {
    res.status(400).json({ error: "انتهت صلاحية رابط إيقاف الرسائل أو استُخدم من قبل." });
    return;
  }
  noStore(res);
  res.json(UnsubscribeParticipantEmailNotificationsResponse.parse({ message: "تم إيقاف رسائل تحديثات البحث لهذا البريد." }));
});

router.post("/participant/notifications/logout", async (req, res): Promise<void> => {
  const tokenHash = participantEmail(req);
  if (tokenHash) {
    await db.update(participantNotificationAccessTokensTable).set({ consumedAt: new Date() })
      .where(and(
        eq(participantNotificationAccessTokensTable.tokenHash, tokenHash),
        eq(participantNotificationAccessTokensTable.purpose, "session"),
        isNull(participantNotificationAccessTokensTable.consumedAt),
      ));
  }
  res.clearCookie(PARTICIPANT_NOTIFICATION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  noStore(res);
  res.json(EndParticipantNotificationSessionResponse.parse({ message: "تم تسجيل الخروج من صندوق الإشعارات." }));
});

router.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "42P01" || code === "42703") {
    req.log.error({ code }, "Participant notification database migration is missing");
    res.status(503).json({
      error: "جداول إشعارات المشاركين غير جاهزة على قاعدة Render. طبّق الترحيل 0015 ثم أعد المحاولة.",
    });
    return;
  }
  next(error);
});

export default router;
