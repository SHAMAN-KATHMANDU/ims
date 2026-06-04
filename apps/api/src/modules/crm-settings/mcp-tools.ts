/**
 * MCP tools — CRM settings lookups (sources & journey types).
 *
 * These are LOOKUP-READ / LOOKUP-WRITE tools: the AI uses list_* to discover
 * the valid values a contact's `source` / `journeyType` may take, and (only
 * after confirming with the user) create_* / update_* to manage them. Contact
 * create/update validates against these via the shared reference validator and
 * rejects unknown values with the option list — see contact.service.ts.
 *
 * Do not edit mcp.server.ts beyond calling registerCrmSettingsMcpTools().
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import crmSettingsService from "./crm-settings.service";

export function registerCrmSettingsMcpTools(
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

  // ── Sources ────────────────────────────────────────────────────────────────

  registerTool(
    "list_crm_sources",
    {
      title: "List contact sources",
      description:
        "[LOOKUP-READ] List the valid contact sources for this tenant. Call this before creating/updating a contact to confirm the `source` value exists — unknown sources are rejected.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.VIEW");
        const result = await crmSettingsService.getAllSources(authCtx.tenantId);
        return mcpJsonResponse(result.sources);
      } catch (err) {
        return mcpErrorResponse(err, "list_crm_sources failed");
      }
    },
  );

  registerTool(
    "create_crm_source",
    {
      title: "Create contact source",
      description:
        "[LOOKUP-WRITE] Add a new contact source. Only call this after the user confirms they want a brand-new source — never invent one. Returns the created {id, name}; then retry the contact create/update.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(100)
          .describe("Source name, e.g. 'Trade Show'"),
      },
    },
    async ({ name }: { name: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const source = await crmSettingsService.createSource(authCtx.tenantId, {
          name,
        });
        return mcpJsonResponse(source);
      } catch (err) {
        return mcpErrorResponse(err, "create_crm_source failed");
      }
    },
  );

  registerTool(
    "update_crm_source",
    {
      title: "Rename contact source",
      description:
        "[LOOKUP-WRITE] Rename an existing contact source by id. Mirrors PUT /crm-settings/sources/:id.",
      inputSchema: {
        id: z.string().uuid().describe("Source id"),
        name: z.string().min(1).max(100).describe("New source name"),
      },
    },
    async ({ id, name }: { id: string; name: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const source = await crmSettingsService.updateSource(
          authCtx.tenantId,
          id,
          { name },
        );
        return mcpJsonResponse(source);
      } catch (err) {
        return mcpErrorResponse(err, "update_crm_source failed");
      }
    },
  );

  // ── Journey types ───────────────────────────────────────────────────────────

  registerTool(
    "list_crm_journey_types",
    {
      title: "List journey types",
      description:
        "[LOOKUP-READ] List the valid journey types for this tenant (user-managed entries plus pipeline-derived labels). Call before setting a contact's `journeyType` — unknown values are rejected.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.VIEW");
        const result = await crmSettingsService.getAllJourneyTypes(
          authCtx.tenantId,
        );
        return mcpJsonResponse(result.journeyTypes);
      } catch (err) {
        return mcpErrorResponse(err, "list_crm_journey_types failed");
      }
    },
  );

  registerTool(
    "create_crm_journey_type",
    {
      title: "Create journey type",
      description:
        "[LOOKUP-WRITE] Add a new journey type. Only call this after the user confirms — never invent one. Returns the created {id, name}; then retry the contact create/update.",
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(100)
          .describe("Journey type name, e.g. 'VIP Onboarding'"),
      },
    },
    async ({ name }: { name: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const journeyType = await crmSettingsService.createJourneyType(
          authCtx.tenantId,
          { name },
        );
        return mcpJsonResponse(journeyType);
      } catch (err) {
        return mcpErrorResponse(err, "create_crm_journey_type failed");
      }
    },
  );

  registerTool(
    "update_crm_journey_type",
    {
      title: "Rename journey type",
      description:
        "[LOOKUP-WRITE] Rename an existing journey type by id. Mirrors PUT /crm-settings/journey-types/:id.",
      inputSchema: {
        id: z.string().uuid().describe("Journey type id"),
        name: z.string().min(1).max(100).describe("New journey type name"),
      },
    },
    async ({ id, name }: { id: string; name: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const journeyType = await crmSettingsService.updateJourneyType(
          authCtx.tenantId,
          id,
          { name },
        );
        return mcpJsonResponse(journeyType);
      } catch (err) {
        return mcpErrorResponse(err, "update_crm_journey_type failed");
      }
    },
  );
}
