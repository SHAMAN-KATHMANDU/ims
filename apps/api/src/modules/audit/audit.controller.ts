import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";

class AuditController {
  async getAuditLogs(req: Request, res: Response) {
    try {
      const query = getValidatedQuery<{
        page?: number;
        limit?: number;
        userId?: string;
        action?: string;
        from?: string;
        to?: string;
      }>(req, res);
      const { page, limit } = getPaginationParams(query);
      const { userId, action, from, to } = query;

      const tenantId = req.user?.tenantId ?? null;
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (action) where.action = action;

      if (from) {
        const fromDate = new Date(from + "T00:00:00.000Z");
        where.createdAt = { ...where.createdAt, gte: fromDate };
      }
      if (to) {
        const toDate = new Date(to + "T23:59:59.999Z");
        where.createdAt = { ...where.createdAt, lte: toDate };
      }

      const skip = (page - 1) * limit;

      const [totalItems, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, username: true, role: true },
            },
          },
        }),
      ]);

      const result = createPaginationResult(logs, totalItems, page, limit);

      res.status(200).json({
        message: "Audit logs fetched",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get audit logs error");
    }
  }
}

export default new AuditController();
