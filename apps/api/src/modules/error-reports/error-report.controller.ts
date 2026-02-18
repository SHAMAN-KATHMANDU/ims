import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

class ErrorReportController {
  async create(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { title, description, pageUrl } = req.body as {
        title?: string;
        description?: string;
        pageUrl?: string;
      };

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      const report = await prisma.errorReport.create({
        data: {
          tenantId: req.user?.tenantId || null,
          userId: req.user.id,
          title: title.trim().slice(0, 255),
          description:
            description && typeof description === "string"
              ? description.trim().slice(0, 5000)
              : null,
          pageUrl:
            pageUrl && typeof pageUrl === "string"
              ? pageUrl.trim().slice(0, 500)
              : null,
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
      const { page, limit } = getPaginationParams(req.query);
      const status = req.query.status as string | undefined;
      const userId = req.query.userId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const where: any = {};
      if (status && ["OPEN", "REVIEWED", "RESOLVED"].includes(status)) {
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
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { status } = req.body as { status?: string };

      if (!status || !["OPEN", "REVIEWED", "RESOLVED"].includes(status)) {
        return res.status(400).json({
          message: "status must be OPEN, REVIEWED, or RESOLVED",
        });
      }

      const report = await prisma.errorReport.update({
        where: { id },
        data: { status: status as "OPEN" | "REVIEWED" | "RESOLVED" },
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
