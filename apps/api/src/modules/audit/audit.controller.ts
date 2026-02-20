import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";

class AuditController {
  async getAuditLogs(req: Request, res: Response) {
    try {
      const { page, limit } = getPaginationParams(req.query);
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const tenantId = req.user?.tenantId ?? null;
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (action) where.action = action;

      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
        const fromDate = new Date(from + "T00:00:00.000Z");
        where.createdAt = { ...where.createdAt, gte: fromDate };
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
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
