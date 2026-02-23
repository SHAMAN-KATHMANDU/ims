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
        { name: "Qualification", order: 1, probability: 10 },
        { name: "Proposal", order: 2, probability: 30 },
        { name: "Negotiation", order: 3, probability: 60 },
        { name: "Closed Won", order: 4, probability: 100 },
        { name: "Closed Lost", order: 5, probability: 0 },
      ];

      const stagesInput =
        Array.isArray(stages) && stages.length > 0
          ? stages.map(
              (
                s: { name?: string; order?: number; probability?: number },
                i: number,
              ) => ({
                name:
                  (s.name ?? "").trim() ||
                  (defaultStages[i]?.name ?? `Stage ${i + 1}`),
                order: typeof s.order === "number" ? s.order : i + 1,
                probability:
                  typeof s.probability === "number" ? s.probability : 0,
              }),
            )
          : defaultStages;

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
          isDefault: !!isDefault,
          pipelineStages: {
            create: stagesInput.map((s) => ({
              name: s.name,
              order: s.order,
              probability: s.probability,
            })),
          },
        },
        include: {
          pipelineStages: { orderBy: { order: "asc" } },
          _count: { select: { deals: true } },
        },
      });

      const stagesForResponse = pipeline.pipelineStages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        probability: s.probability,
      }));

      res.status(201).json({
        message: "Pipeline created successfully",
        pipeline: { ...pipeline, stages: stagesForResponse },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create pipeline error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const pipelines = await prisma.pipeline.findMany({
        where: { tenantId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: {
          pipelineStages: { orderBy: { order: "asc" } },
          _count: { select: { deals: true } },
        },
      });

      const pipelinesWithStages = pipelines.map((p) => ({
        ...p,
        stages: p.pipelineStages.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          probability: s.probability,
        })),
      }));

      res.status(200).json({ message: "OK", pipelines: pipelinesWithStages });
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

      const pipeline = await prisma.pipeline.findFirst({
        where: { id, tenantId },
        include: {
          pipelineStages: { orderBy: { order: "asc" } },
          _count: { select: { deals: true } },
        },
      });

      if (!pipeline) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      const stages = pipeline.pipelineStages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        probability: s.probability,
      }));

      res.status(200).json({
        message: "OK",
        pipeline: { ...pipeline, stages },
      });
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

      const existing = await prisma.pipeline.findFirst({
        where: { id, tenantId },
        include: { pipelineStages: true },
      });
      if (!existing) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      if (isDefault) {
        await prisma.pipeline.updateMany({
          where: { tenantId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: { name?: string; isDefault?: boolean } = {};
      if (name !== undefined) updateData.name = name || existing.name;
      if (isDefault !== undefined) updateData.isDefault = !!isDefault;

      if (stages !== undefined && Array.isArray(stages)) {
        await prisma.pipelineStage.deleteMany({ where: { pipelineId: id } });
        if (stages.length > 0) {
          await prisma.pipelineStage.createMany({
            data: stages.map(
              (
                s: { name?: string; order?: number; probability?: number },
                i: number,
              ) => ({
                pipelineId: id,
                name: (s.name ?? "").trim() || `Stage ${i + 1}`,
                order: typeof s.order === "number" ? s.order : i,
                probability:
                  typeof s.probability === "number" ? s.probability : 0,
              }),
            ),
          });
        }
      }

      const pipeline = await prisma.pipeline.update({
        where: { id },
        data: updateData,
        include: {
          pipelineStages: { orderBy: { order: "asc" } },
          _count: { select: { deals: true } },
        },
      });

      const stagesForResponse = pipeline.pipelineStages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        probability: s.probability,
      }));

      res.status(200).json({
        message: "Pipeline updated successfully",
        pipeline: { ...pipeline, stages: stagesForResponse },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update pipeline error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { id } = req.params;

      const existing = await prisma.pipeline.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Pipeline not found" });
      }

      const dealCount = await prisma.deal.count({
        where: { tenantId, pipelineId: id },
      });
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
