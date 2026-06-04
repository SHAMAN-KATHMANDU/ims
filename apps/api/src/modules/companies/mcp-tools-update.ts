/**
 * MCP update/read tools — Companies module.
 * Mirrors GET /companies, GET /companies/:id, PUT /companies/:id.
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
  UpdateCompanySchema,
  type UpdateCompanyDto,
} from "@/modules/companies/company.schema";

export function registerCompaniesUpdateMcpTools(
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
    "list_companies",
    {
      title: "List companies",
      description:
        "[LOOKUP-READ] List CRM companies for the tenant. Use to find a company id before linking it to a contact/deal/task or to update it.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.COMPANIES.VIEW");
        const result = await companyService.getAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_companies failed");
      }
    },
  );

  registerTool(
    "get_company",
    {
      title: "Get company",
      description: "Fetch a single company by id.",
      inputSchema: { id: z.string().uuid().describe("Target company id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.COMPANIES.VIEW");
        const company = await companyService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(company);
      } catch (err) {
        return mcpErrorResponse(err, "get_company failed");
      }
    },
  );

  registerTool(
    "update_company",
    {
      title: "Update company",
      description:
        "Update a company. Mirrors PUT /companies/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target company id"),
        ...UpdateCompanySchema.shape,
      },
    },
    async (args: { id: string } & UpdateCompanyDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.COMPANIES.UPDATE");
        const { id, ...data } = args;
        const company = await companyService.update(
          authCtx.tenantId,
          id,
          data as UpdateCompanyDto,
        );
        return mcpJsonResponse(company);
      } catch (err) {
        return mcpErrorResponse(err, "update_company failed");
      }
    },
  );
}
