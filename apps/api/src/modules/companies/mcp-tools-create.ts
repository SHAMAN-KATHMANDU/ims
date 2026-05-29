/**
 * MCP Create Tools — Companies Module
 *
 * Mirrors POST /companies.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import companyService from "@/modules/companies/company.service";
import {
  CreateCompanySchema,
  type CreateCompanyDto,
} from "@/modules/companies/company.schema";

export function registerCompaniesCreateMcpTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  registerTool(
    "create_company",
    {
      title: "Create company",
      description: "Create a CRM company record. Mirrors POST /companies.",
      inputSchema: CreateCompanySchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.COMPANIES.CREATE");
        const company = await companyService.create(
          authCtx.tenantId,
          dto as CreateCompanyDto,
        );
        return mcpJsonResponse(company);
      } catch (err) {
        return mcpErrorResponse(err, "create_company failed");
      }
    },
  );
}
