import { Request, Response } from "express";
import { ok, okPaginated } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as errorReportsService from "./error-reports.service";

class ErrorReportController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const report = await errorReportsService.create(
      auth.tenantId ?? null,
      auth.userId,
      req.body,
    );
    return ok(res, { report }, 201, "Error report submitted");
  }

  async list(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<errorReportsService.ListErrorReportsQuery>(
      req,
      res,
    );
    const result = await errorReportsService.list(auth.tenantId ?? null, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Error reports fetched",
    );
  }

  async updateStatus(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const { status } = req.body;
    const report = await errorReportsService.updateStatus(id, status);
    return ok(res, { report }, 200, "Status updated");
  }
}

export default new ErrorReportController();
