/**
 * Report controller: handle download endpoint with token validation.
 */

import { Request, Response } from "express";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import * as storage from "./report.storage";
import reportService from "./report.service";
import { logger } from "@/config/logger";

class ReportController {
  /**
   * Download a report file by ID and token.
   *
   * Query params:
   *   token: signed token (HMAC)
   *   format: "pdf" or "excel"
   */
  download = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { token, format } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Missing or invalid token" });
      }

      if (!format || !["pdf", "excel"].includes(String(format))) {
        return res.status(400).json({ message: "Invalid format" });
      }

      const reportFormat = format as "pdf" | "excel";

      // Validate token
      let tokenPayload;
      try {
        tokenPayload = storage.validateDownloadToken(token);
      } catch (err) {
        logger.warn(
          `Invalid or expired download token for report ${id}`,
          undefined,
          err,
        );
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Verify reportId matches
      if (tokenPayload.reportId !== id) {
        logger.warn(
          `Token reportId mismatch: expected ${id}, got ${tokenPayload.reportId}`,
        );
        return res.status(403).json({ message: "Token does not match report" });
      }

      // Verify format matches
      if (tokenPayload.format !== reportFormat) {
        logger.warn(
          `Token format mismatch: expected ${reportFormat}, got ${tokenPayload.format}`,
        );
        return res.status(403).json({ message: "Token does not match format" });
      }

      // Verify tenant matches authenticated user's tenant
      const userTenantId = (req as any).user?.tenantId;
      if (!userTenantId || tokenPayload.tenantId !== userTenantId) {
        logger.warn(
          `Tenant mismatch for report ${id}: user=${userTenantId}, token=${tokenPayload.tenantId}`,
        );
        return res.status(403).json({ message: "Forbidden" });
      }

      // Download file
      const buffer = await reportService.downloadReport(
        id,
        userTenantId,
        reportFormat,
      );

      if (!buffer) {
        logger.warn(`Report file not found: ${id} (${reportFormat})`);
        return res.status(404).json({ message: "Report not found" });
      }

      // Set response headers
      const contentType =
        reportFormat === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const fileName =
        reportFormat === "pdf" ? `report-${id}.pdf` : `report-${id}.xlsx`;

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      return res.send(buffer);
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (typeof appErr.statusCode === "number") {
        return res.status(appErr.statusCode).json({
          message: appErr.message,
        });
      }
      return sendControllerError(req, res, error, "Report download error");
    }
  };
}

export default new ReportController();
