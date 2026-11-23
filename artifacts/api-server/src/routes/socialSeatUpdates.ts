import { Router } from "express";
import { requireManagedOwner } from "../middlewares/ownerAuth";
import { listSocialSeatUpdates, retrySocialSeatUpdate } from "../lib/socialSeatUpdateWorker";

const router = Router();

function positiveId(value: unknown) {
  const id = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

router.get("/admin/programs/:id/social-seat-updates", requireManagedOwner, async (req, res): Promise<void> => {
  const opportunityId = positiveId(req.params["id"]);
  if (!opportunityId) {
    res.status(400).json({ error: "رقم الفرصة غير صحيح." });
    return;
  }
  try {
    const events = await listSocialSeatUpdates(opportunityId);
    res.setHeader("Cache-Control", "no-store");
    res.json({ events });
  } catch (error) {
    req.log.error({ err: error, opportunityId }, "Could not list automatic social seat updates");
    res.status(503).json({ error: "سجل تحديث المقاعد غير جاهز. تحقق من ترحيلات قاعدة Render." });
  }
});

router.post("/admin/social-seat-updates/:id/retry", requireManagedOwner, async (req, res): Promise<void> => {
  const eventId = positiveId(req.params["id"]);
  if (!eventId) {
    res.status(400).json({ error: "رقم تحديث المقاعد غير صحيح." });
    return;
  }
  try {
    const result = await retrySocialSeatUpdate(eventId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.message });
      return;
    }
    res.status(202).json({ message: result.message });
  } catch (error) {
    req.log.error({ err: error, eventId }, "Could not retry automatic social seat update");
    res.status(503).json({ error: "تعذر إعادة وضع التحديث في قائمة الإرسال." });
  }
});

export default router;
