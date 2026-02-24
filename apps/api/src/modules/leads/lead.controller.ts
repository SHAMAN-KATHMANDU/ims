import { Request, Response } from "express";
import { ok, okPaginated } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as leadsService from "./leads.service";

class LeadController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const lead = await leadsService.create(
      auth.tenantId,
      auth.userId,
      req.body,
    );
    return ok(res, { lead }, 201, "Lead created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<leadsService.ListLeadsQuery>(req, res);
    const result = await leadsService.getAll(auth.tenantId, query);
    return okPaginated(res, result.data, result.pagination, "OK");
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const lead = await leadsService.getById(auth.tenantId, id);
    return ok(res, { lead }, 200, "OK");
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const lead = await leadsService.update(auth.tenantId, id, req.body);
    return ok(res, { lead }, 200, "Lead updated successfully");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    await leadsService.deleteLead(auth.tenantId, id);
    return ok(res, undefined, 200, "Lead deleted successfully");
  }

  async convert(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const result = await leadsService.convert(
      auth.tenantId,
      auth.userId,
      id,
      req.body,
    );
    return ok(res, result, 200, "Lead converted successfully");
  }

  async assign(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const { assignedToId } = req.body;
    const lead = await leadsService.assign(
      auth.tenantId,
      auth.userId,
      id,
      assignedToId,
    );
    return ok(res, { lead }, 200, "Lead assigned");
  }
}

export default new LeadController();
