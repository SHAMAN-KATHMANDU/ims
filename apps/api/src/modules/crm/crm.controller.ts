import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as crmService from "./crm.service";

class CrmController {
  async getDashboard(req: Request, res: Response) {
    const auth = req.authContext!;

    const data = await crmService.getDashboard(auth.tenantId);
    return ok(res, data, 200, "OK");
  }

  async getReports(req: Request, res: Response) {
    const auth = req.authContext!;

    const { year } = getValidatedQuery<{ year?: number }>(req, res);
    const data = await crmService.getReports(auth.tenantId, year);
    return ok(res, data, 200, "OK");
  }

  async exportReportsCsv(req: Request, res: Response) {
    const auth = req.authContext!;

    const { year } = getValidatedQuery<{ year?: number }>(req, res);
    const { buffer, filename } = await crmService.exportReports(
      auth.tenantId,
      year,
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return res.send(Buffer.from(buffer));
  }
}

export default new CrmController();
