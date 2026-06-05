/**
 * MCP update/read tools — Contacts module.
 *
 * Mirrors PUT /contacts/:id, GET /contacts/:id, GET /contacts/tags.
 * update_contact accepts partial fields and runs the same reference validation
 * as create (companyId, memberId, tagIds, source, journeyType) via
 * contact.service.ts — so unknown lookups are rejected with the option list.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import contactService from "@/modules/contacts/contact.service";
import {
  UpdateContactSchema,
  type UpdateContactDto,
} from "@/modules/contacts/contact.schema";

export function registerContactsUpdateMcpTools(
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
    "get_contact",
    {
      title: "Get contact",
      description:
        "Fetch a single contact by id (with company, tags, deals, journey type). Use list_contacts first to find the id.",
      inputSchema: {
        id: z.string().uuid().describe("Target contact id"),
      },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.VIEW");
        const contact = await contactService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(contact);
      } catch (err) {
        return mcpErrorResponse(err, "get_contact failed");
      }
    },
  );

  registerTool(
    "update_contact",
    {
      title: "Update contact",
      description:
        "Update an existing contact's fields. Mirrors PUT /contacts/:id. Only provided fields change. " +
        "Reference fields are validated: companyId/memberId/tagIds must exist; source and journeyType must be valid lookups " +
        "(call list_crm_sources / list_crm_journey_types first — unknown values are rejected with the valid options).",
      inputSchema: {
        id: z.string().uuid().describe("Target contact id"),
        ...UpdateContactSchema.shape,
      },
    },
    async (args: { id: string } & UpdateContactDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const { id, ...data } = args;
        const contact = await contactService.update(
          authCtx.tenantId,
          id,
          data as UpdateContactDto,
        );
        return mcpJsonResponse(contact);
      } catch (err) {
        return mcpErrorResponse(err, "update_contact failed");
      }
    },
  );

  registerTool(
    "list_contact_tags",
    {
      title: "List contact tags",
      description:
        "[LOOKUP-READ] List the contact tags for this tenant. Use to find valid tag ids before tagging a contact via create_contact/update_contact.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.VIEW");
        const result = await contactService.getTags(authCtx.tenantId);
        return mcpJsonResponse(result.tags);
      } catch (err) {
        return mcpErrorResponse(err, "list_contact_tags failed");
      }
    },
  );
}
