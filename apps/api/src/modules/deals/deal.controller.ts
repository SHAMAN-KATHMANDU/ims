import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

class DealController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const {
        name,
        value,
        stage,
        probability,
        status,
        expectedCloseDate,
        contactId,
        memberId,
        companyId,
        pipelineId,
        assignedToId,
      } = req.body;

      const pipeline = pipelineId
        ? await prisma.pipeline.findUnique({
            where: { id: pipelineId },
            include: { pipelineStages: { orderBy: { order: "asc" } } },
          })
        : await prisma.pipeline.findFirst({
            where: { isDefault: true },
            include: { pipelineStages: { orderBy: { order: "asc" } } },
          });

      if (!pipeline) {
        return res.status(400).json({
          message: "No pipeline found. Create a default pipeline first.",
        });
      }

      const stageNames = pipeline.pipelineStages.map((s) => s.name);
      const firstStage =
        stageNames.length > 0 ? stageNames[0] : "Qualification";

      const deal = await prisma.deal.create({
        data: {
          tenantId,
          name,
          value: Number(value) || 0,
          stage: stage || firstStage,
          probability: Math.min(100, Math.max(0, Number(probability) || 0)),
          status: status === "WON" || status === "LOST" ? status : "OPEN",
          expectedCloseDate: expectedCloseDate
            ? new Date(expectedCloseDate)
            : null,
          contactId: contactId || null,
          memberId: memberId || null,
          companyId: companyId || null,
          pipelineId: pipeline.id,
          assignedToId: assignedToId || userId,
          createdById: userId,
        },
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          member: {
            select: { id: true, name: true, phone: true, email: true },
          },
          company: { select: { id: true, name: true } },
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
        },
      });

      res.status(201).json({ message: "Deal created successfully", deal });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create deal error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const query = getValidatedQuery<{
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        pipelineId?: string;
        stage?: string;
        status?: "OPEN" | "WON" | "LOST";
        assignedToId?: string;
      }>(req, res);
      const { page, limit, sortBy, sortOrder, search } =
        getPaginationParams(query);
      const { pipelineId, stage, status, assignedToId } = query;

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "name",
        "value",
        "expectedCloseDate",
        "id",
      ];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" as const } },
          {
            contact: {
              OR: [
                {
                  firstName: { contains: search, mode: "insensitive" as const },
                },
                {
                  lastName: { contains: search, mode: "insensitive" as const },
                },
              ],
            },
          },
          {
            member: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          },
          {
            company: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ];
      }
      if (pipelineId) where.pipelineId = pipelineId;
      if (stage) where.stage = stage;
      if (status) where.status = status;
      if (assignedToId) where.assignedToId = assignedToId;

      const skip = (page - 1) * limit;

      const [totalItems, deals] = await Promise.all([
        prisma.deal.count({ where }),
        prisma.deal.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            member: { select: { id: true, name: true, phone: true } },
            company: { select: { id: true, name: true } },
            pipeline: true,
            assignedTo: { select: { id: true, username: true } },
          },
        }),
      ]);

      const result = createPaginationResult(deals, totalItems, page, limit);
      res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get deals error");
    }
  }

  async getByPipeline(req: Request, res: Response) {
    try {
      const { pipelineId } = getValidatedQuery<{ pipelineId?: string }>(
        req,
        res,
      );

      const pipeline = pipelineId
        ? await prisma.pipeline.findUnique({
            where: { id: pipelineId },
            include: { pipelineStages: { orderBy: { order: "asc" } } },
          })
        : await prisma.pipeline.findFirst({
            where: { isDefault: true },
            include: { pipelineStages: { orderBy: { order: "asc" } } },
          });

      if (!pipeline) {
        return res.status(404).json({ message: "No pipeline found" });
      }

      const stageNames = pipeline.pipelineStages.map((s) => s.name);

      const deals = await prisma.deal.findMany({
        where: {
          pipelineId: pipeline.id,
          status: "OPEN",
        },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const byStage = stageNames.map((stageName) => ({
        stage: stageName,
        deals: deals.filter((d) => d.stage === stageName),
      }));

      res.status(200).json({
        message: "OK",
        pipeline,
        stages: byStage,
        deals,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get deals by pipeline error",
      );
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deal = await prisma.deal.findUnique({
        where: { id },
        include: {
          contact: true,
          member: true,
          company: true,
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
          lead: true,
          tasks: {
            include: { assignedTo: { select: { id: true, username: true } } },
          },
          activities: {
            include: { creator: { select: { id: true, username: true } } },
          },
        },
      });

      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      res.status(200).json({ message: "OK", deal });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get deal by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;
      const {
        name,
        value,
        stage,
        probability,
        status,
        expectedCloseDate,
        closedAt,
        lostReason,
        contactId,
        memberId,
        companyId,
        assignedToId,
      } = req.body;

      const existing = await prisma.deal.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Deal not found" });
      }

      const updateData: Record<string, unknown> = {
        ...(name !== undefined && { name: name || existing.name }),
        ...(value !== undefined && { value: Number(value) ?? existing.value }),
        ...(stage !== undefined && { stage }),
        ...(probability !== undefined && {
          probability: Math.min(100, Math.max(0, Number(probability) ?? 0)),
        }),
        ...(status !== undefined && { status }),
        ...(expectedCloseDate !== undefined && {
          expectedCloseDate: expectedCloseDate
            ? new Date(expectedCloseDate)
            : null,
        }),
        ...(closedAt !== undefined && {
          closedAt: closedAt ? new Date(closedAt) : null,
        }),
        ...(lostReason !== undefined && {
          lostReason: lostReason || null,
        }),
        ...(contactId !== undefined && { contactId: contactId || null }),
        ...(memberId !== undefined && { memberId: memberId || null }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(assignedToId !== undefined && { assignedToId }),
      };

      if (status === "WON" || status === "LOST") {
        (updateData as any).closedAt = new Date();
      }

      const deal = await prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          contact: true,
          member: true,
          company: true,
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
        },
      });

      if (stage && stage !== existing.stage && existing.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: existing.assignedToId,
            type: "DEAL_STAGE_CHANGE",
            title: "Deal stage updated",
            message: `Deal "${deal.name}" moved to ${stage}`,
            resourceType: "deal",
            resourceId: deal.id,
          },
        });
      }

      res.status(200).json({ message: "Deal updated successfully", deal });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update deal error");
    }
  }

  async updateStage(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;
      const { stage } = req.body;

      const existing = await prisma.deal.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Deal not found" });
      }

      const deal = await prisma.deal.update({
        where: { id },
        data: { stage },
        include: {
          contact: true,
          member: true,
          company: true,
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
        },
      });

      if (existing.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: existing.assignedToId,
            type: "DEAL_STAGE_CHANGE",
            title: "Deal stage updated",
            message: `Deal "${deal.name}" moved to ${stage}`,
            resourceType: "deal",
            resourceId: deal.id,
          },
        });
      }

      res.status(200).json({ message: "Deal stage updated", deal });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update deal stage error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.deal.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Deal not found" });
      }

      await prisma.deal.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete deal error");
    }
  }
}

export default new DealController();
