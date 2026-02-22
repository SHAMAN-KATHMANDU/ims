import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { sendControllerError } from "@/utils/controllerError";

class ErrorReportController {
  async create(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { title, description, pageUrl } = req.body as {
        title: string;
        description?: string;
        pageUrl?: string;
      };

      const report = await prisma.errorReport.create({
        data: {
          tenantId: req.user?.tenantId || null,
          userId: req.user.id,
          title: title.slice(0, 255),
          description: description ? description.slice(0, 5000) : null,
          pageUrl: pageUrl ? pageUrl.slice(0, 500) : null,
        },
        include: {
          user: { select: { id: true, username: true } },
        },
      });

      res.status(201).json({
        message: "Error report submitted",
        report,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create error report failed");
    }
  }

  async list(req: Request, res: Response) {
    try {
      const query = getValidatedQuery<{
        page?: number;
        limit?: number;
        status?: "OPEN" | "REVIEWED" | "RESOLVED";
        userId?: string;
        from?: string;
        to?: string;
      }>(req, res);
      const { page, limit } = getPaginationParams(query);
      const { status, userId, from, to } = query;

      const tenantId = req.user?.tenantId ?? null;
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (status) {
        where.status = status;
      }
      if (userId) where.userId = userId;
      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
        const fromDate = new Date(from + "T00:00:00.000Z");
        where.createdAt = { ...where.createdAt, gte: fromDate };
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        const toDate = new Date(to + "T23:59:59.999Z");
        where.createdAt = { ...where.createdAt, lte: toDate };
      }

      const skip = (page - 1) * limit;

      const [totalItems, reports] = await Promise.all([
        prisma.errorReport.count({ where }),
        prisma.errorReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, username: true } },
          },
        }),
      ]);

      const result = createPaginationResult(reports, totalItems, page, limit);

      res.status(200).json({
        message: "Error reports fetched",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List error reports failed");
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as {
        status: "OPEN" | "REVIEWED" | "RESOLVED";
      };

      const report = await prisma.errorReport.update({
        where: { id },
        data: { status },
        include: {
          user: { select: { id: true, username: true } },
        },
      });

      res.status(200).json({
        message: "Status updated",
        report,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Update error report status failed",
      );
    }
  }
}

export default new ErrorReportController();
