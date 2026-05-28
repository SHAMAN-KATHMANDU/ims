/**
 * MCP tools for reports: register the report_render tool with the server.
 * Mirrors the registerTool aliasing trick from mcp.server.ts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import reportService from "./report.service";
import { env } from "@/config/env";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";

function getBaseUrl(): string {
  // env.publicApiUrl looks like "https://api.example.com/api/v1"; strip the /api/v1 suffix
  return (
    (env as any).publicApiUrl?.replace(/\/api\/v1\/?$/, "") ??
    "http://localhost:4000"
  );
}

export function registerReportTools(
  server: McpServer,
  authCtx: McpAuthContext,
): void {
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  const baseUrl = getBaseUrl();

  registerTool(
    "report_render",
    {
      title: "Generate a Report",
      description:
        "Generate a PDF or Excel report for Sales, CRM, or Inventory workflows. Returns short-lived signed download URLs (1-hour TTL). Use this at the end of the daily_sales_analysis, crm_staff_activity_review, and inventory_decision prompts.",
      inputSchema: {
        workflow: z
          .enum(["sales", "crm", "inventory"])
          .describe("Which Yantra workflow this report is for"),
        format: z
          .enum(["pdf", "excel", "both"])
          .describe("Output format(s) to render"),
        payload: z
          .record(z.any())
          .describe(
            "Workflow-specific structured payload. See the prompt body for the expected shape per workflow.",
          ),
      },
    },
    async ({ workflow, format, payload }) => {
      try {
        const result = await reportService.generateReport(
          authCtx.tenantId,
          authCtx.tenantSlug,
          workflow as "sales" | "crm" | "inventory",
          format as "pdf" | "excel" | "both",
          payload,
          baseUrl,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  reportId: result.reportId,
                  downloadUrls: result.downloadUrls,
                  expiresAt: result.expiresAt,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: err?.message ?? "Report generation failed",
                statusCode: err?.statusCode ?? 500,
              }),
            },
          ],
        };
      }
    },
  );
}
