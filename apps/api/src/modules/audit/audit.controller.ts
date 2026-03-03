import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import auditService, { AuditService } from "./audit.service";

class AuditController {
  constructor(private service: AuditService) {}

  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId ?? null;
      const result = await this.service.getAuditLogs(tenantId, req.query);
      return res.status(200).json({
        message: "Audit logs fetched",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get audit logs error");
    }
  };
}

const auditController = new AuditController(auditService);
export default auditController;
