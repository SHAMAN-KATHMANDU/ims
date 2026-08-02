/**
 * MCP read/update tools — Attribute Types module.
 * Mirrors GET/PUT /attribute-types(/:id) and GET/PUT
 * /attribute-types/:typeId/values(/:valueId) plus the value-usage endpoint.
 * Note service arg order: getById(id, tenantId), update(id, tenantId, data),
 * value methods take (typeId, [valueId,] tenantId, [data]).
 * Deletes are intentionally not exposed over MCP — admin UI only.
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
  UpdateAttributeTypeSchema,
  UpdateAttributeValueSchema,
  type UpdateAttributeTypeDto,
  type UpdateAttributeValueDto,
} from "@/modules/attribute-types/attribute-type.schema";

export function registerAttributeTypesReadMcpTools(
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
    "list_attribute_types",
    {
      title: "List attribute types",
      description:
        "[LOOKUP-READ] List all product attribute types (with their values) for the tenant. Use to resolve a typeId before creating values or assigning attributes to product variations.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.VIEW");
        const attributeTypes = await attributeTypeService.list(
          authCtx.tenantId,
        );
        return mcpJsonResponse(attributeTypes);
      } catch (err) {
        return mcpErrorResponse(err, "list_attribute_types failed");
      }
    },
  );

  registerTool(
    "get_attribute_type",
    {
      title: "Get attribute type",
      description: "Fetch a single attribute type by id, including its values.",
      inputSchema: {
        id: z.string().uuid().describe("Target attribute type id"),
      },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.VIEW");
        const attributeType = await attributeTypeService.getById(
          id,
          authCtx.tenantId,
        );
        return mcpJsonResponse(attributeType);
      } catch (err) {
        return mcpErrorResponse(err, "get_attribute_type failed");
      }
    },
  );

  registerTool(
    "update_attribute_type",
    {
      title: "Update attribute type",
      description:
        "Update an attribute type. Mirrors PUT /attribute-types/:id. Only provided fields change; changing `code` re-checks uniqueness (409 on duplicate).",
      inputSchema: {
        id: z.string().uuid().describe("Target attribute type id"),
        ...UpdateAttributeTypeSchema.shape,
      },
    },
    async (args: { id: string } & UpdateAttributeTypeDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.UPDATE");
        const { id, ...data } = args;
        const attributeType = await attributeTypeService.update(
          id,
          authCtx.tenantId,
          data as UpdateAttributeTypeDto,
        );
        return mcpJsonResponse(attributeType);
      } catch (err) {
        return mcpErrorResponse(err, "update_attribute_type failed");
      }
    },
  );

  registerTool(
    "list_attribute_values",
    {
      title: "List attribute values",
      description:
        "[LOOKUP-READ] List the values of one attribute type. Mirrors GET /attribute-types/:typeId/values.",
      inputSchema: {
        typeId: z.string().uuid().describe("Parent attribute type id"),
      },
    },
    async ({ typeId }: { typeId: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.VIEW");
        const values = await attributeTypeService.listValues(
          typeId,
          authCtx.tenantId,
        );
        return mcpJsonResponse(values);
      } catch (err) {
        return mcpErrorResponse(err, "list_attribute_values failed");
      }
    },
  );

  registerTool(
    "update_attribute_value",
    {
      title: "Update attribute value",
      description:
        "Update a value of an attribute type. Mirrors PUT /attribute-types/:typeId/values/:valueId. Only provided fields change; values stay unique per type (409 on duplicate).",
      inputSchema: {
        typeId: z.string().uuid().describe("Parent attribute type id"),
        valueId: z.string().uuid().describe("Target attribute value id"),
        ...UpdateAttributeValueSchema.shape,
      },
    },
    async (
      args: { typeId: string; valueId: string } & UpdateAttributeValueDto,
    ) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.UPDATE");
        const { typeId, valueId, ...data } = args;
        const value = await attributeTypeService.updateValue(
          typeId,
          valueId,
          authCtx.tenantId,
          data as UpdateAttributeValueDto,
        );
        return mcpJsonResponse(value);
      } catch (err) {
        return mcpErrorResponse(err, "update_attribute_value failed");
      }
    },
  );

  registerTool(
    "get_attribute_value_usage",
    {
      title: "Get attribute value usage",
      description:
        "Get how many product variations/products use an attribute value. Check usage before asking an admin to delete or merge values (deletes happen in the admin UI only).",
      inputSchema: {
        typeId: z.string().uuid().describe("Parent attribute type id"),
        valueId: z.string().uuid().describe("Target attribute value id"),
      },
    },
    async ({ typeId, valueId }: { typeId: string; valueId: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.ATTRIBUTE_TYPES.VIEW");
        const usage = await attributeTypeService.getValueUsage(
          typeId,
          valueId,
          authCtx.tenantId,
        );
        return mcpJsonResponse(usage);
      } catch (err) {
        return mcpErrorResponse(err, "get_attribute_value_usage failed");
      }
    },
  );
}
