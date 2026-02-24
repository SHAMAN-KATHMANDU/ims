import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { pipelinesService } from "./pipelines.service";

class PipelineController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const { name, stages, isDefault } = req.body;
    const pipeline = await pipelinesService.create(auth.tenantId, {
      name,
      stages,
      isDefault,
    });
    return ok(res, { pipeline }, 201, "Pipeline created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const pipelines = await pipelinesService.getAll(auth.tenantId);
    return ok(res, { pipelines });
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const pipeline = await pipelinesService.getById(id, auth.tenantId);
    return ok(res, { pipeline });
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const { name, stages, isDefault } = req.body;
    const pipeline = await pipelinesService.update(id, auth.tenantId, {
      name,
      stages,
      isDefault,
    });
    return ok(res, { pipeline }, 200, "Pipeline updated successfully");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await pipelinesService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Pipeline deleted successfully");
  }
}

export default new PipelineController();
