import { Request, Response } from "express";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import {
  createDeal,
  getAllDeals,
  getDealsByPipeline,
  getDealById,
  updateDeal,
  updateDealStage,
  deleteDeal,
} from "./deals.service";

class DealController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const deal = await createDeal(req.body, auth);
    return ok(res, { deal }, 201, "Deal created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

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
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) ?? {
      createdAt: "desc",
    };
    const sortKey = Object.keys(orderBy)[0] ?? "createdAt";
    const sortDir = (orderBy[sortKey] ?? "desc") as "asc" | "desc";

    const { deals, totalItems } = await getAllDeals({
      tenantId: auth.tenantId,
      page,
      limit,
      sortBy: sortKey,
      sortOrder: sortDir,
      search,
      pipelineId,
      stage,
      status,
      assignedToId,
    });

    const result = createPaginationResult(deals, totalItems, page, limit);
    return okPaginated(res, result.data, result.pagination, "OK");
  }

  async getByPipeline(req: Request, res: Response) {
    const auth = req.authContext!;

    const { pipelineId } = getValidatedQuery<{ pipelineId?: string }>(req, res);
    const { pipeline, stages, deals } = await getDealsByPipeline(
      pipelineId,
      auth,
    );
    return ok(res, { pipeline, stages, deals }, 200, "OK");
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const deal = await getDealById(id, auth);
    return ok(res, { deal }, 200, "OK");
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const deal = await updateDeal(id, req.body, auth);
    return ok(res, { deal }, 200, "Deal updated successfully");
  }

  async updateStage(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const { stage } = req.body;
    const deal = await updateDealStage(id, stage, auth);
    return ok(res, { deal }, 200, "Deal stage updated");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    await deleteDeal(id, auth);
    return ok(res, undefined, 200, "Deal deleted successfully");
  }
}

export default new DealController();
