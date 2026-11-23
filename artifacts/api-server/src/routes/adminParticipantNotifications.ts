import { Router } from "express";
import {
  ListProgramParticipantNotificationsResponse,
  PublishProgramParticipantUpdateBody,
  PublishProgramParticipantUpdateResponse,
  RetryProgramParticipantNotificationParams,
  RetryProgramParticipantNotificationResponse,
  ListProgramParticipantNotificationsParams,
} from "@workspace/api-zod";
import { requireManagedOwner } from "../middlewares/ownerAuth";
import {
  listProgramParticipantNotifications,
  publishParticipantResearchUpdate,
  retryParticipantNotificationEvent,
  type ParticipantNotificationEventSummary,
} from "../lib/participantNotificationService";

const router = Router();

function eventResponse(summary: ParticipantNotificationEventSummary) {
  return {
    ...summary,
    createdAt: summary.createdAt.toISOString(),
  };
}

function positiveId(value: unknown) {
  const id = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

router.get("/admin/programs/:id/participant-notifications", requireManagedOwner, async (req, res): Promise<void> => {
  const params = ListProgramParticipantNotificationsParams.safeParse(req.params);
  const opportunityId = params.success ? params.data.id : positiveId(req.params["id"]);
  if (!opportunityId) {
    res.status(400).json({ error: "رقم الفرصة البحثية غير صحيح." });
    return;
  }
  try {
    const events = await listProgramParticipantNotifications(opportunityId);
    res.setHeader("Cache-Control", "no-store");
    res.json(ListProgramParticipantNotificationsResponse.parse({ events: events.map(eventResponse) }));
  } catch (error) {
    req.log.error({ err: error, opportunityId }, "Could not list participant research notifications");
    res.status(503).json({ error: "جداول الإشعارات غير جاهزة على قاعدة Render؛ تحقق من تطبيق الترحيل." });
  }
});

router.post("/admin/programs/:id/participant-notifications", requireManagedOwner, async (req, res): Promise<void> => {
  const opportunityId = positiveId(req.params["id"]);
  if (!opportunityId) {
    res.status(400).json({ error: "رقم الفرصة البحثية غير صحيح." });
    return;
  }
  const parsed = PublishProgramParticipantUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "تحقق من المرحلة واكتب رسالة التحديث قبل النشر." });
    return;
  }

  try {
    const ownerEmail = String(res.locals.owner?.email || "");
    const result = await publishParticipantResearchUpdate({
      opportunityId,
      idempotencyKey: parsed.data.idempotencyKey,
      stage: parsed.data.stage,
      message: parsed.data.message,
      publishedBy: ownerEmail,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.message });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(202).json(PublishProgramParticipantUpdateResponse.parse(eventResponse(result.summary)));
  } catch (error) {
    req.log.error({ err: error, opportunityId }, "Could not publish participant research update");
    res.status(503).json({ error: "تعذر حفظ تحديث المشاركين. تحقق من جداول الإشعارات على قاعدة Render." });
  }
});

router.post("/admin/participant-notifications/:id/retry", requireManagedOwner, async (req, res): Promise<void> => {
  const params = RetryProgramParticipantNotificationParams.safeParse(req.params);
  const eventId = params.success ? params.data.id : positiveId(req.params["id"]);
  if (!eventId) {
    res.status(400).json({ error: "رقم سجل الإشعار غير صحيح." });
    return;
  }
  try {
    const result = await retryParticipantNotificationEvent(eventId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.message });
      return;
    }
    res.status(202).json(RetryProgramParticipantNotificationResponse.parse({
      message: result.message,
      queued: result.queued,
    }));
  } catch (error) {
    req.log.error({ err: error, eventId }, "Could not retry participant notification deliveries");
    res.status(503).json({ error: "تعذر إعادة إرسال الإشعارات الفاشلة. تحقق من قاعدة Render." });
  }
});

export default router;
