import { Request, Response } from "express";
import { ok, okPaginated } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as companiesService from "./companies.service";

class CompanyController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const company = await companiesService.create(auth.tenantId, req.body);
    return ok(res, { company }, 201, "Company created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<companiesService.ListCompaniesQuery>(
      req,
      res,
    );
    const result = await companiesService.getAll(auth.tenantId, query);
    return okPaginated(res, result.data, result.pagination, "OK");
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const company = await companiesService.getById(auth.tenantId, id);
    return ok(res, { company }, 200, "OK");
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const company = await companiesService.update(auth.tenantId, id, req.body);
    return ok(res, { company }, 200, "Company updated successfully");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    await companiesService.deleteCompany(auth.tenantId, id);
    return ok(res, undefined, 200, "Company deleted successfully");
  }

  async listForSelect(req: Request, res: Response) {
    const auth = req.authContext!;

    const companies = await companiesService.listForSelect(auth.tenantId);
    return ok(res, { companies }, 200, "OK");
  }
}

export default new CompanyController();
