import { Request, Response } from "express";
import { CrmReportsQuerySchema } from "./crm.schema";
import crmService from "./crm.service";
import { sendControllerError } from "@/utils/controllerError";

class CrmController {
  getDashboard = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const data = await crmService.getDashboard(tenantId);
      return res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "CRM dashboard error");
    }
  };

  getReports = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { year } = CrmReportsQuerySchema.parse(req.query);
      const data = await crmService.getReports(tenantId, year);
      return res.status(200).json({ message: "OK", data });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "CRM reports error");
    }
  };

  exportReportsCsv = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { year } = CrmReportsQuerySchema.parse(req.query);
      const buffer = await crmService.exportReportsExcel(tenantId, year);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="crm-reports-${year}-${Date.now()}.xlsx"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      return res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Export CRM reports error");
    }
  };
}

export default new CrmController();
