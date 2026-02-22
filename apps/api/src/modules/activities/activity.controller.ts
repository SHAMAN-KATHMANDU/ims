import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

const ACTIVITY_TYPES = ["CALL", "MEETING"] as const;

class ActivityController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { type, subject, notes, activityAt, contactId, memberId, dealId } =
        req.body;

      const activity = await prisma.activity.create({
        data: {
          tenantId,
          type: type as (typeof ACTIVITY_TYPES)[number],
          subject: subject || null,
          notes: notes || null,
          activityAt: activityAt ? new Date(activityAt) : new Date(),
          contactId: contactId || null,
          memberId: memberId || null,
          dealId: dealId || null,
          createdById: userId,
        },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          member: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true } },
        },
      });

      res.status(201).json({ message: "Activity logged", activity });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create activity error");
    }
  }

  async getByContact(req: Request, res: Response) {
    try {
      const { contactId } = req.params;

      const activities = await prisma.activity.findMany({
        where: { contactId },
        orderBy: { activityAt: "desc" },
        include: {
          creator: { select: { id: true, username: true } },
          member: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true } },
        },
      });

      res.status(200).json({ message: "OK", activities });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get activities by contact error",
      );
    }
  }

  async getByDeal(req: Request, res: Response) {
    try {
      const { dealId } = req.params;

      const activities = await prisma.activity.findMany({
        where: { dealId },
        orderBy: { activityAt: "desc" },
        include: {
          creator: { select: { id: true, username: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          member: { select: { id: true, name: true, phone: true } },
        },
      });

      res.status(200).json({ message: "OK", activities });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get activities by deal error",
      );
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const activity = await prisma.activity.findUnique({
        where: { id },
        include: {
          contact: true,
          member: true,
          deal: true,
          creator: { select: { id: true, username: true } },
        },
      });

      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.status(200).json({ message: "OK", activity });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get activity by id error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.activity.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Activity not found" });
      }

      await prisma.activity.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Activity deleted" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete activity error");
    }
  }
}

export default new ActivityController();
