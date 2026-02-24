import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { activitiesService } from "./activities.service";

class ActivityController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;
    const { type, subject, notes, activityAt, contactId, memberId, dealId } =
      req.body;
    const activity = await activitiesService.create(
      auth.tenantId,
      auth.userId,
      {
        type,
        subject,
        notes,
        activityAt,
        contactId,
        memberId,
        dealId,
      },
    );
    return ok(res, { activity }, 201, "Activity logged");
  }

  async getByContact(req: Request, res: Response) {
    const auth = req.authContext!;
    const { contactId } = req.params as { contactId: string };
    const { activities } = await activitiesService.getByContact(
      auth.tenantId,
      contactId,
    );
    return ok(res, { activities }, 200, "OK");
  }

  async getByDeal(req: Request, res: Response) {
    const auth = req.authContext!;
    const { dealId } = req.params as { dealId: string };
    const { activities } = await activitiesService.getByDeal(
      auth.tenantId,
      dealId,
    );
    return ok(res, { activities }, 200, "OK");
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };
    const activity = await activitiesService.getById(id, auth.tenantId);
    return ok(res, { activity }, 200, "OK");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;
    const { id } = req.params as { id: string };
    await activitiesService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Activity deleted");
  }
}

export default new ActivityController();
