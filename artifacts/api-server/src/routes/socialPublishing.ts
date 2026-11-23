import { Router } from "express";
import {
  db,
  researchProgramsTable,
  socialConnectionsTable,
  socialPostRecordsTable,
  type SocialConnection,
} from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { requireManagedOwner } from "../middlewares/ownerAuth";
import { getOpportunityVisibility } from "../lib/opportunityVisibility";
import { getSiteContentSettings } from "../lib/siteContentSettings";
import { decryptSocialSecret, encryptSocialSecret } from "../lib/socialSecurity";
import { buildSocialPostContent } from "../lib/socialPostContent";
import { SocialProviderError, publishToConnection, verifyTelegramBot } from "../lib/socialProviders";
import { refreshXConnection } from "../lib/socialTokenRefresh";

const router = Router();
const supportedPlatforms = new Set(["facebook", "instagram", "x", "telegram"]);
const socialStatusLabels: Record<string, string> = {
  publishing: "قيد الإرسال",
  published: "تم النشر",
  failed: "فشل النشر",
  unknown: "تعذر تأكيد النتيجة",
};

function positiveId(value: unknown) {
  const id = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function safeConnection(connection: SocialConnection) {
  return {
    id: connection.id,
    platform: connection.platform,
    accountName: connection.accountName,
    status: connection.status,
    tokenExpiresAt: connection.tokenExpiresAt,
    needsReauthorization: connection.status === "needs_reauth",
  };
}

function publicPostRecord(record: typeof socialPostRecordsTable.$inferSelect) {
  return {
    id: record.id,
    platform: record.platform,
    accountName: record.accountName,
    status: record.status,
    statusLabel: socialStatusLabels[record.status] || "غير معروف",
    content: record.content,
    externalPostId: record.externalPostId,
    lastError: record.lastError,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function loadShareContent(opportunityId: number) {
  const [opportunity] = await db.select().from(researchProgramsTable)
    .where(eq(researchProgramsTable.id, opportunityId)).limit(1);
  if (!opportunity) return null;
  const hiddenFields = (await getOpportunityVisibility([opportunityId])).get(opportunityId) ?? [
    "title", "preview", "specialty",
  ];
  const siteSettings = await getSiteContentSettings().catch(() => null);
  const content = buildSocialPostContent({
    id: opportunity.id,
    titleEn: opportunity.titleEn,
    specialtyEn: opportunity.specialtyEn,
    imagePath: opportunity.imagePath,
    hiddenFields,
    siteImageUrl: siteSettings?.brand?.socialShareImageUrl,
  });
  return { opportunity, content };
}

async function reservePost(opportunityId: number, connection: SocialConnection, content: string) {
  return db.transaction(async (tx) => {
    const lockKey = `${opportunityId}:${connection.platform}:${connection.accountId}`;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(5711, hashtext(${lockKey}))`);
    const [existing] = await tx.select().from(socialPostRecordsTable).where(and(
      eq(socialPostRecordsTable.opportunityId, opportunityId),
      eq(socialPostRecordsTable.platform, connection.platform),
      eq(socialPostRecordsTable.accountId, connection.accountId),
    )).limit(1);

    if (existing?.status === "published") {
      return { record: existing, skip: "published" as const };
    }
    if (existing?.status === "unknown") {
      return { record: existing, skip: "unknown" as const };
    }
    if (existing?.status === "publishing") {
      const staleAfterMs = 15 * 60 * 1000;
      if (Date.now() - existing.updatedAt.getTime() > staleAfterMs) {
        const [updated] = await tx.update(socialPostRecordsTable)
          .set({
            status: "unknown",
            lastError: "توقف الطلب قبل تسجيل النتيجة. تحقق من حساب التواصل قبل أي إعادة نشر.",
            updatedAt: new Date(),
          })
          .where(eq(socialPostRecordsTable.id, existing.id))
          .returning();
        return { record: updated || existing, skip: "unknown" as const };
      }
      return { record: existing, skip: "publishing" as const };
    }
    if (existing) {
      const [updated] = await tx.update(socialPostRecordsTable)
        .set({
          connectionId: connection.id,
          accountName: connection.accountName,
          status: "publishing",
          content,
          externalPostId: "",
          lastError: "",
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(socialPostRecordsTable.id, existing.id))
        .returning();
      return { record: updated, skip: null };
    }
    const [created] = await tx.insert(socialPostRecordsTable).values({
      opportunityId,
      connectionId: connection.id,
      platform: connection.platform,
      accountId: connection.accountId,
      accountName: connection.accountName,
      status: "publishing",
      content,
    }).returning();
    return { record: created, skip: null };
  });
}

async function publishOne(opportunityId: number, connection: SocialConnection, content: ReturnType<typeof buildSocialPostContent>) {
  const reservation = await reservePost(opportunityId, connection, content.text);
  if (reservation.skip) {
    return {
      post: publicPostRecord(reservation.record),
      message: reservation.skip === "published"
        ? "سبق نشر هذه الفرصة على هذا الحساب؛ لم يتم إنشاء منشور مكرر."
        : reservation.skip === "unknown"
          ? "لم تتأكد نتيجة المحاولة السابقة؛ تحقق من الحساب قبل إعادة النشر."
          : "يوجد طلب نشر قيد المعالجة لهذا الحساب.",
    };
  }

  try {
    const activeConnection = await refreshXConnection(connection);
    const externalPostId = await publishToConnection(activeConnection, content);
    const [updated] = await db.update(socialPostRecordsTable).set({
      status: "published",
      externalPostId: externalPostId.slice(0, 300),
      lastError: "",
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialPostRecordsTable.id, reservation.record.id)).returning();
    return { post: publicPostRecord(updated || reservation.record), message: "تم النشر." };
  } catch (error) {
    const providerError = error instanceof SocialProviderError
      ? error
      : new SocialProviderError("تعذر النشر حالياً. تحقق من إعداد الحساب ثم أعد المحاولة.");
    const status = providerError.outcomeUnknown ? "unknown" : "failed";
    if (providerError.statusCode === 401 || providerError.statusCode === 403) {
      await db.update(socialConnectionsTable).set({ status: "needs_reauth", updatedAt: new Date() })
        .where(eq(socialConnectionsTable.id, connection.id));
    }
    const [updated] = await db.update(socialPostRecordsTable).set({
      status,
      lastError: providerError.message.slice(0, 500),
      updatedAt: new Date(),
    }).where(eq(socialPostRecordsTable.id, reservation.record.id)).returning();
    return {
      post: publicPostRecord(updated || reservation.record),
      message: providerError.message,
    };
  }
}

router.get("/admin/social/connections", requireManagedOwner, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const connections = await db.select().from(socialConnectionsTable)
      .where(inArray(socialConnectionsTable.status, ["active", "needs_reauth"]))
      .orderBy(asc(socialConnectionsTable.platform), asc(socialConnectionsTable.accountName));
    res.json({
      encryptionConfigured: Boolean(process.env["SOCIAL_CREDENTIALS_ENCRYPTION_KEY"]),
      providers: {
        meta: Boolean(process.env["META_APP_ID"] && process.env["META_APP_SECRET"] && process.env["META_GRAPH_API_VERSION"]),
        x: Boolean(process.env["X_CLIENT_ID"]),
        telegram: true,
      },
      connections: connections.map(safeConnection),
    });
  } catch (error) {
    req.log.error({ err: error }, "Social connection data is unavailable");
    res.status(503).json({ error: "قاعدة البيانات أو جداول النشر غير جاهزة. يلزم إعدادها على Render قبل ربط الحسابات." });
  }
});

router.post("/admin/social/telegram", requireManagedOwner, async (req, res) => {
  const token = typeof req.body?.botToken === "string" ? req.body.botToken.trim() : "";
  const chatId = typeof req.body?.chatId === "string" ? req.body.chatId.trim() : "";
  if (token.length < 20 || token.length > 300 || chatId.length < 2 || chatId.length > 150 ||
      !/^(?:-?\d{2,30}|@[A-Za-z0-9_]{5,32})$/.test(chatId)) {
    res.status(400).json({ error: "تحقق من رمز البوت ومعرّف القناة أو اسمها العام." });
    return;
  }
  try {
    const verified = await verifyTelegramBot(token, chatId);
    const encryptedToken = encryptSocialSecret(token);
    const [connection] = await db.insert(socialConnectionsTable).values({
      platform: "telegram",
      accountId: verified.accountId,
      accountName: verified.accountName,
      accessTokenEncrypted: encryptedToken,
      metadata: { chatId, botName: verified.botName },
      status: "active",
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [socialConnectionsTable.platform, socialConnectionsTable.accountId],
      set: {
        accountName: verified.accountName,
        accessTokenEncrypted: encryptedToken,
        metadata: { chatId, botName: verified.botName },
        status: "active",
        updatedAt: new Date(),
      },
    }).returning();
    res.status(201).json({ connection: safeConnection(connection) });
  } catch (error) {
    const message = error instanceof SocialProviderError
      ? error.message
      : "تعذر حفظ إعداد Telegram. تحقق من مفتاح التشفير وإعداد الخادم.";
    res.status(error instanceof SocialProviderError ? 400 : 503).json({ error: message });
  }
});

router.delete("/admin/social/connections/:id", requireManagedOwner, async (req, res) => {
  const id = positiveId(req.params["id"]);
  if (!id) {
    res.status(400).json({ error: "معرّف الحساب غير صحيح." });
    return;
  }
  const [connection] = await db.update(socialConnectionsTable).set({
    status: "disconnected",
    accessTokenEncrypted: "",
    refreshTokenEncrypted: "",
    tokenExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(socialConnectionsTable.id, id)).returning({ id: socialConnectionsTable.id });
  if (!connection) {
    res.status(404).json({ error: "الحساب غير موجود." });
    return;
  }
  res.status(204).end();
});

router.get("/admin/programs/:id/social-posts", requireManagedOwner, async (req, res) => {
  const opportunityId = positiveId(req.params["id"]);
  if (!opportunityId) {
    res.status(400).json({ error: "رقم الفرصة غير صحيح." });
    return;
  }
  const posts = await db.select().from(socialPostRecordsTable)
    .where(eq(socialPostRecordsTable.opportunityId, opportunityId))
    .orderBy(asc(socialPostRecordsTable.platform), asc(socialPostRecordsTable.accountName));
  res.setHeader("Cache-Control", "no-store");
  res.json({ posts: posts.map(publicPostRecord) });
});

router.get("/admin/programs/:id/social-preview", requireManagedOwner, async (req, res) => {
  const opportunityId = positiveId(req.params["id"]);
  if (!opportunityId) {
    res.status(400).json({ error: "رقم الفرصة غير صحيح." });
    return;
  }
  const share = await loadShareContent(opportunityId);
  if (!share) {
    res.status(404).json({ error: "الفرصة البحثية غير موجودة." });
    return;
  }
  const { opportunity, content } = share;
  if ((opportunity.category || "active") !== "active" || opportunity.status !== "open" || opportunity.seatsLeft <= 0) {
    res.status(409).json({ error: "يمكن معاينة ونشر الفرص المفتوحة ذات المقاعد المتاحة فقط." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({
    opportunityId,
    text: content.text,
    shareUrl: content.shareUrl,
    imageUrl: content.imageUrl,
    titleVisible: content.titleVisible,
    specialtyVisible: content.specialtyVisible,
    opportunityImageVisible: content.opportunityImageVisible,
  });
});

router.post("/admin/programs/:id/social-posts", requireManagedOwner, async (req, res) => {
  const opportunityId = positiveId(req.params["id"]);
  const rawIds = req.body?.connectionIds;
  const connectionIds = Array.isArray(rawIds)
    ? [...new Set(rawIds.map(positiveId).filter((id): id is number => id !== null))]
    : [];
  if (!opportunityId || connectionIds.length === 0 || connectionIds.length > 12 ||
      connectionIds.length !== rawIds.length) {
    res.status(400).json({ error: "اختر حساب تواصل واحداً على الأقل." });
    return;
  }
  const share = await loadShareContent(opportunityId);
  if (!share) {
    res.status(404).json({ error: "الفرصة البحثية غير موجودة." });
    return;
  }
  const { opportunity, content } = share;
  if ((opportunity.category || "active") !== "active" || opportunity.status !== "open" || opportunity.seatsLeft <= 0) {
    res.status(409).json({ error: "لا يمكن نشر هذه الفرصة؛ تأكد من أنها مفتوحة وبها مقاعد متاحة." });
    return;
  }
  const connections = await db.select().from(socialConnectionsTable).where(and(
    inArray(socialConnectionsTable.id, connectionIds),
    eq(socialConnectionsTable.status, "active"),
  ));
  if (connections.length !== connectionIds.length || connections.some((item) => !supportedPlatforms.has(item.platform))) {
    res.status(400).json({ error: "أحد الحسابات المختارة غير متصل أو غير مدعوم." });
    return;
  }

  const results = await Promise.all(connections.map(async (connection) => {
    if (connection.platform === "instagram" && !content.imageUrl) {
      return {
        post: null,
        connectionId: connection.id,
        platform: connection.platform,
        accountName: connection.accountName,
        message: "Instagram يتطلب صورة عامة؛ لم تُرسل صورة خاصة أو مخفية.",
      };
    }
    const result = await publishOne(opportunityId, connection, content);
    return {
      ...result,
      connectionId: connection.id,
      platform: connection.platform,
      accountName: connection.accountName,
    };
  }));
  const hasFailure = results.some((item) => item.post?.status === "failed" || item.post?.status === "unknown");
  res.status(hasFailure ? 207 : 200).json({
    results,
    message: hasFailure ? "اكتمل النشر على بعض الحسابات؛ راجع الحالة لكل منصة." : "تمت معالجة الحسابات المختارة.",
  });
});

router.post("/admin/social/posts/:id/retry", requireManagedOwner, async (req, res) => {
  const postId = positiveId(req.params["id"]);
  if (!postId) {
    res.status(400).json({ error: "معرّف المنشور غير صحيح." });
    return;
  }
  const [record] = await db.select().from(socialPostRecordsTable)
    .where(eq(socialPostRecordsTable.id, postId)).limit(1);
  if (!record) {
    res.status(404).json({ error: "سجل النشر غير موجود." });
    return;
  }
  if (record.status !== "failed") {
    res.status(409).json({ error: record.status === "unknown"
      ? "لا يمكن إعادة المحاولة تلقائياً لأن نتيجة النشر غير مؤكدة. تحقق من الحساب أولاً."
      : "يمكن إعادة المحاولة للسجلات التي فشلت بوضوح فقط." });
    return;
  }
  const [connection] = await db.select().from(socialConnectionsTable).where(and(
    eq(socialConnectionsTable.id, record.connectionId),
    eq(socialConnectionsTable.status, "active"),
  )).limit(1);
  if (!connection) {
    res.status(409).json({ error: "أعد ربط الحساب قبل إعادة المحاولة." });
    return;
  }
  const share = await loadShareContent(record.opportunityId);
  if (!share) {
    res.status(404).json({ error: "الفرصة البحثية غير موجودة." });
    return;
  }
  if ((share.opportunity.category || "active") !== "active" || share.opportunity.status !== "open" || share.opportunity.seatsLeft <= 0) {
    res.status(409).json({ error: "لا يمكن إعادة النشر؛ الفرصة لم تعد مفتوحة للتسجيل." });
    return;
  }
  const result = await publishOne(record.opportunityId, connection, share.content);
  res.status(result.post.status === "failed" || result.post.status === "unknown" ? 207 : 200).json(result);
});

export default router;
