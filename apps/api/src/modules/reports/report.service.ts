/**
 * Report orchestration service: takes (workflow, format, payload) → generates files → returns signed URLs.
 */

import { randomUUID } from "crypto";
import { logger } from "@/config/logger";
import { env } from "@/config/env";
import * as storage from "./report.storage";
import * as pdfRendering from "./report.pdf";
import * as excelRendering from "./report.excel";
import type {
  ReportWorkflow,
  ReportFormat,
  ReportPayloadMap,
  SignedReportUrl,
} from "./report.types";
import {
  SalesReportPayloadSchema,
  CrmReportPayloadSchema,
  InventoryReportPayloadSchema,
} from "./report.types";

class ReportService {
  /**
   * Generate a report: validate payload, render PDF/Excel, save files, return signed URLs.
   */
  async generateReport<W extends ReportWorkflow>(
    tenantId: string,
    tenantName: string,
    workflow: W,
    format: ReportFormat,
    payload: any, // LLM-generated payload (any shape, will be validated)
    baseUrl: string,
  ): Promise<SignedReportUrl> {
    // Validate payload based on workflow
    let validPayload: any;
    try {
      switch (workflow) {
        case "sales":
          validPayload = SalesReportPayloadSchema.parse(payload);
          break;
        case "crm":
          validPayload = CrmReportPayloadSchema.parse(payload);
          break;
        case "inventory":
          validPayload = InventoryReportPayloadSchema.parse(payload);
          break;
        default:
          throw new Error(`Unknown workflow: ${workflow}`);
      }
    } catch (validationError) {
      logger.error(
        `Payload validation failed for ${workflow}`,
        undefined,
        validationError,
      );
      throw new Error(
        `Invalid payload for ${workflow} workflow: ${
          validationError instanceof Error
            ? validationError.message
            : String(validationError)
        }`,
      );
    }

    const reportId = randomUUID();
    const downloadUrls: Record<string, string> = {};
    let expiresAt: string | null = null;

    try {
      // Generate PDF if requested
      if (format === "pdf" || format === "both") {
        const pdfBuffer = await this.renderPdf(
          workflow,
          validPayload,
          tenantName,
        );
        await storage.saveReportFile(tenantId, reportId, "pdf", pdfBuffer);

        const { url, expiresAt: exp } = storage.generateSignedDownloadUrl(
          reportId,
          tenantId,
          "pdf",
          baseUrl,
        );
        downloadUrls.pdf = url;
        expiresAt = exp;

        logger.log(`Generated PDF report for ${workflow}: ${reportId}`);
      }

      // Generate Excel if requested
      if (format === "excel" || format === "both") {
        const excelBuffer = await this.renderExcel(
          workflow,
          validPayload,
          tenantName,
        );
        await storage.saveReportFile(tenantId, reportId, "excel", excelBuffer);

        const { url, expiresAt: exp } = storage.generateSignedDownloadUrl(
          reportId,
          tenantId,
          "excel",
          baseUrl,
        );
        downloadUrls.excel = url;
        expiresAt = exp;

        logger.log(`Generated Excel report for ${workflow}: ${reportId}`);
      }

      if (!expiresAt) {
        throw new Error("No expiration time set");
      }

      return {
        reportId,
        downloadUrls: downloadUrls as Record<"pdf" | "excel", string>,
        expiresAt,
      };
    } catch (error) {
      logger.error(`Failed to generate report ${reportId}`, undefined, error);
      throw error;
    }
  }

  /**
   * Render PDF based on workflow.
   */
  private async renderPdf(
    workflow: ReportWorkflow,
    payload: any,
    tenantName: string,
  ): Promise<Buffer> {
    switch (workflow) {
      case "sales":
        return await pdfRendering.renderSalesPdf(payload, tenantName);
      case "crm":
        return await pdfRendering.renderCrmPdf(payload, tenantName);
      case "inventory":
        return await pdfRendering.renderInventoryPdf(payload, tenantName);
      default:
        throw new Error(`Unknown workflow for PDF: ${workflow}`);
    }
  }

  /**
   * Render Excel based on workflow.
   */
  private async renderExcel(
    workflow: ReportWorkflow,
    payload: any,
    tenantName: string,
  ): Promise<Buffer> {
    switch (workflow) {
      case "sales":
        return await excelRendering.renderSalesExcel(payload, tenantName);
      case "crm":
        return await excelRendering.renderCrmExcel(payload, tenantName);
      case "inventory":
        return await excelRendering.renderInventoryExcel(payload, tenantName);
      default:
        throw new Error(`Unknown workflow for Excel: ${workflow}`);
    }
  }

  /**
   * Download a report file by ID and validated token.
   * Returns the file buffer or null if not found.
   */
  async downloadReport(
    reportId: string,
    tenantId: string,
    format: "pdf" | "excel",
  ): Promise<Buffer | null> {
    try {
      const buffer = await storage.readReportFile(tenantId, reportId, format);
      return buffer;
    } catch (error) {
      logger.error(`Error downloading report ${reportId}`, undefined, error);
      throw error;
    }
  }
}

export default new ReportService();
