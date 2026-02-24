import { Request, Response } from "express";
import { okPaginated } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as auditService from "./audit.service";

class AuditController {
  async getAuditLogs(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<auditService.AuditLogsQuery>(req, res);
    const result = await auditService.getAuditLogs(auth.tenantId, query);

    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Audit logs fetched",
    );
  }
}

export default new AuditController();
