/**
 * MCP Create Tools — Contacts Module
 *
 * Mirrors POST /contacts, POST /contacts/tags, POST /contacts/:id/notes,
 * POST /contacts/:id/communications.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { assertPlanLimitByTenantId } from "@/middlewares/enforcePlanLimits";
import contactService from "@/modules/contacts/contact.service";
import {
  CreateContactSchema,
  CreateTagSchema,
  AddNoteSchema,
  AddCommunicationSchema,
  type CreateContactDto,
  type AddNoteDto,
  type AddCommunicationDto,
} from "@/modules/contacts/contact.schema";

export function registerContactsCreateMcpTools(
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
    "create_contact",
    {
      title: "Create contact",
      description:
        "Create a new CRM contact. Mirrors POST /contacts. Optionally link to a company, member, or tags.",
      inputSchema: CreateContactSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.CREATE");
        await assertPlanLimitByTenantId(authCtx.tenantId, "customers");
        const contact = await contactService.create(
          authCtx.tenantId,
          dto as CreateContactDto,
          authCtx.userId,
        );
        return mcpJsonResponse(contact);
      } catch (err) {
        return mcpErrorResponse(err, "create_contact failed");
      }
    },
  );

  registerTool(
    "create_contact_tag",
    {
      title: "Create contact tag",
      description:
        "Create a tag for grouping contacts. Mirrors POST /contacts/tags.",
      inputSchema: CreateTagSchema.shape,
    },
    async ({ name }: { name: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACTS.UPDATE");
        const tag = await contactService.createTag(authCtx.tenantId, name);
        return mcpJsonResponse(tag);
      } catch (err) {
        return mcpErrorResponse(err, "create_contact_tag failed");
      }
    },
  );

  registerTool(
    "add_contact_note",
    {
      title: "Add note to contact",
      description:
        "Append a free-text note to a contact's timeline. Mirrors POST /contacts/:id/notes.",
      inputSchema: {
        contactId: z.string().uuid().describe("Target contact id"),
        ...AddNoteSchema.shape,
      },
    },
    async (args: { contactId: string } & AddNoteDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACT_NOTES.CREATE");
        const { contactId, ...data } = args;
        const note = await contactService.addNote(
          authCtx.tenantId,
          contactId,
          data,
          authCtx.userId,
        );
        return mcpJsonResponse(note);
      } catch (err) {
        return mcpErrorResponse(err, "add_contact_note failed");
      }
    },
  );

  registerTool(
    "add_contact_communication",
    {
      title: "Log communication on contact",
      description:
        "Record a call, email, or meeting against a contact. Mirrors POST /contacts/:id/communications.",
      inputSchema: {
        contactId: z.string().uuid().describe("Target contact id"),
        ...AddCommunicationSchema.shape,
      },
    },
    async (args: { contactId: string } & AddCommunicationDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.CONTACT_COMMUNICATIONS.CREATE");
        const { contactId, ...data } = args;
        const comm = await contactService.addCommunication(
          authCtx.tenantId,
          contactId,
          data,
          authCtx.userId,
        );
        return mcpJsonResponse(comm);
      } catch (err) {
        return mcpErrorResponse(err, "add_contact_communication failed");
      }
    },
  );
}
