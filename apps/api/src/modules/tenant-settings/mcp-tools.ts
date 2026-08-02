/**
 * MCP tools — Tenant Settings module (payment-method configuration).
 * Mirrors GET /tenant-settings/payment-methods and
 * PUT /tenant-settings/payment-methods.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import tenantSettingsService from "@/modules/tenant-settings/tenant-settings.service";
import {
  PaymentMethodConfigSchema,
  UpsertPaymentMethodsSchema,
  type UpsertPaymentMethodsDto,
} from "@/modules/tenant-settings/tenant-settings.schema";

export function registerTenantSettingsMcpTools(
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
    "get_payment_methods",
    {
      title: "Get payment methods",
      description:
        "Fetch the tenant's configured payment methods (falls back to defaults when none are enabled). Mirrors GET /tenant-settings/payment-methods.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.TENANT.VIEW");
        const result = await tenantSettingsService.getPaymentMethods(
          authCtx.tenantId,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "get_payment_methods failed");
      }
    },
  );

  registerTool(
    "update_payment_methods",
    {
      title: "Update payment methods",
      description:
        "Replace the tenant's payment-method configuration (full list, not a patch). Mirrors PUT /tenant-settings/payment-methods. Fetch current methods first with get_payment_methods.",
      inputSchema: {
        paymentMethods: z
          .array(PaymentMethodConfigSchema)
          .describe("Complete payment-method list"),
      },
    },
    async (raw: Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.TENANT.UPDATE_BRANDING");
        const dto = UpsertPaymentMethodsSchema.parse(
          raw,
        ) as UpsertPaymentMethodsDto;
        const result = await tenantSettingsService.upsertPaymentMethods(
          authCtx.tenantId,
          dto,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "update_payment_methods failed");
      }
    },
  );
}
