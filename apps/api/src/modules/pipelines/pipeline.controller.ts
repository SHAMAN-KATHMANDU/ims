import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

class PipelineController {
  async create(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { name, stages, isDefault } = req.body;

      const defaultStages = [
        { id: "1", name: "Qualification", order: 1, probability: 10 },
        { id: "2", name: "Proposal", order: 2, probability: 30 },
        { id: "3", name: "Negotiation", order: 3, probability: 60 },
        { id: "4", name: "Closed Won", order: 4, probability: 100 },
        { id: "5", name: "Closed Lost", order: 5, probability: 0 },
      ];

      const pipelineStages =
        Array.isArray(stages) && stages.length > 0 ? stages : defaultStages;

      if (isDefault) {
        await prisma.pipeline.updateMany({
          where: { tenantId },
          data: { isDefault: false },
        });
      }

      const pipeline = await prisma.pipeline.create({
        data: {
          tenantId,
          name,
          stages: pipelineStages,
          isDefault: !!isDefault,
        },
      });

      res
        .status(201)
        .json({ message: "Pipeline created successfully", pipeline });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create pipeline error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const pipelines = await prisma.pipeline.findMany({
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: {
          _count: { select: { deals: true } },
        },
      });

      res.status(200).json({ message: "OK", pipelines });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get pipelines error");
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { id } = req.params;

      const pipeline = await prisma.pipeline.findUnique({
        where: { id },
        include: { _count: { select: { deals: true } } },
      });

      if (!pipeline) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      res.status(200).json({ message: "OK", pipeline });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get pipeline by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { id } = req.params;
      const { name, stages, isDefault } = req.body;

      const existing = await prisma.pipeline.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      if (isDefault) {
        await prisma.pipeline.updateMany({
          where: { tenantId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name || existing.name;
      if (stages !== undefined && Array.isArray(stages))
        updateData.stages = stages;
      if (isDefault !== undefined) updateData.isDefault = !!isDefault;

      const pipeline = await prisma.pipeline.update({
        where: { id },
        data: updateData,
      });

      res
        .status(200)
        .json({ message: "Pipeline updated successfully", pipeline });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update pipeline error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.pipeline.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      const dealCount = await prisma.deal.count({ where: { pipelineId: id } });
      if (dealCount > 0) {
        return res.status(400).json({
          message:
            "Cannot delete pipeline with existing deals. Move or remove deals first.",
        });
      }

      await prisma.pipeline.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Pipeline deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete pipeline error");
    }
  }
}

export default new PipelineController();
