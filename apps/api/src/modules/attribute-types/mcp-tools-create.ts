/**
 * MCP Create Tools — Attribute Types Module
 *
 * Mirrors POST /attribute-types and POST /attribute-types/:typeId/values.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import attributeTypeService from "@/modules/attribute-types/attribute-type.service";
import {
  CreateAttributeTypeSchema,
  CreateAttributeValueSchema,
  type CreateAttributeTypeDto,
  type CreateAttributeValueDto,
} from "@/modules/attribute-types/attribute-type.schema";

export function registerAttributeTypesCreateMcpTools(
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
    "create_attribute_type",
    {
      title: "Create attribute type",
      description:
        "Create a product attribute type (e.g. Size, Color) used by product variations. Mirrors POST /attribute-types. `code` is auto-derived from `name` (lowercased, spaces → underscores) when omitted; codes are unique per tenant (409 on duplicate). Call list_attribute_types first to avoid duplicates.",
      inputSchema: CreateAttributeTypeSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.CREATE");
        const attributeType = await attributeTypeService.create(
          authCtx.tenantId,
          dto as CreateAttributeTypeDto,
        );
        return mcpJsonResponse(attributeType);
      } catch (err) {
        return mcpErrorResponse(err, "create_attribute_type failed");
      }
    },
  );

  registerTool(
    "create_attribute_value",
    {
      title: "Create attribute value",
      description:
        "Add a value (e.g. XL, Red) to an existing attribute type. Mirrors POST /attribute-types/:typeId/values. Values are unique per type (409 on duplicate). Resolve typeId via list_attribute_types first.",
      inputSchema: {
        typeId: z.string().uuid().describe("Parent attribute type id"),
        ...CreateAttributeValueSchema.shape,
      },
    },
    async (args: { typeId: string } & CreateAttributeValueDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.UPDATE");
        const { typeId, ...data } = args;
        const value = await attributeTypeService.createValue(
          typeId,
          authCtx.tenantId,
          data,
        );
        return mcpJsonResponse(value);
      } catch (err) {
        return mcpErrorResponse(err, "create_attribute_value failed");
      }
    },
  );
}
