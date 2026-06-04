/**
 * MCP server factory for IMS.
 *
 * One McpServer per request (stateless transport pattern). Domain tools are
 * co-located with their owning modules (products/, sales/, crm/, inventory/,
 * reports/); this file is a thin orchestrator that wires them together.
 *
 * Tenant scoping flows through Prisma AsyncLocalStorage — see config/prisma.ts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getVersion } from "@/config/version";
import { registerProductsMcpTools } from "@/modules/products/mcp-tools";
import { registerSalesAnalyticsTools } from "@/modules/sales/mcp-tools";
import { registerInventoryAnalyticsTools } from "@/modules/inventory/mcp-tools";
import { registerCrmAnalyticsTools } from "@/modules/crm/mcp-tools";
import { registerReportTools } from "@/modules/reports/mcp-tools";
import { registerYantraPrompts } from "./prompts";

// Create-side mutation tools (one per domain).
import { registerProductsCreateMcpTools } from "@/modules/products/mcp-tools-create";
import { registerContactsCreateMcpTools } from "@/modules/contacts/mcp-tools-create";
import { registerDealsCreateMcpTools } from "@/modules/deals/mcp-tools-create";
import { registerActivitiesCreateMcpTools } from "@/modules/activities/mcp-tools-create";
import { registerTasksCreateMcpTools } from "@/modules/tasks/mcp-tools-create";
import { registerInventoryCreateMcpTools } from "@/modules/inventory/mcp-tools-create";
import { registerCompaniesCreateMcpTools } from "@/modules/companies/mcp-tools-create";
import { registerVendorsCreateMcpTools } from "@/modules/vendors/mcp-tools-create";
import { registerLocationsCreateMcpTools } from "@/modules/locations/mcp-tools-create";
import { registerLeadsCreateMcpTools } from "@/modules/leads/mcp-tools-create";
import { registerCategoriesCreateMcpTools } from "@/modules/categories/mcp-tools-create";
import { registerBundlesCreateMcpTools } from "@/modules/bundles/mcp-tools-create";
import { registerTransfersCreateMcpTools } from "@/modules/transfers/mcp-tools-create";
import { registerPromosCreateMcpTools } from "@/modules/promos/mcp-tools-create";
import { registerMembersCreateMcpTools } from "@/modules/members/mcp-tools-create";
import { registerPipelinesCreateMcpTools } from "@/modules/pipelines/mcp-tools-create";
import { registerAutomationCreateMcpTools } from "@/modules/automation/mcp-tools-create";
import { registerBlogCreateMcpTools } from "@/modules/blog/mcp-tools-create";
import { registerPagesCreateMcpTools } from "@/modules/pages/mcp-tools-create";
import { registerMediaCreateMcpTools } from "@/modules/media/mcp-tools-create";

// Update / read / lookup tools (CRU additions).
import { registerCrmSettingsMcpTools } from "@/modules/crm-settings/mcp-tools";
import { registerContactsUpdateMcpTools } from "@/modules/contacts/mcp-tools-update";

export interface McpAuthContext {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userRole?: string;
}

/**
 * Global behavioral guidance surfaced to the model (MCP `instructions`).
 * Enforces the check → confirm → create protocol for references, since the
 * tools themselves are stateless and cannot prompt the user mid-call.
 */
const MCP_INSTRUCTIONS = `IMS reference-validation protocol — follow this whenever you create or update records.

NAMED LOOKUPS (contact source, journey type, tags, category, vendor, location, discount type):
1. Call the matching list_* tool first (e.g. list_crm_sources, list_crm_journey_types) to see the valid values.
2. If the user's value already exists, use it. If it does NOT exist, ASK the user to confirm before creating it — never invent a value.
3. Only after the user confirms, call the matching create_* tool (e.g. create_crm_source), then retry the create/update.
4. If a create/update is rejected with an error containing "availableOptions", show those options to the user and pick one or confirm creating a new one — do not retry the same unknown value.

FOREIGN-KEY IDS (companyId, memberId, contactId, dealId, pipelineId, assignedToId, categoryId, vendorId, …):
- Resolve the id with the matching list_*/get_* tool before using it. Unknown or soft-deleted ids are rejected.

DEAL STAGES: a deal's stage must be one of its pipeline's stages — list_pipelines to see them.

JOURNEY TYPE is an editable lookup: a contact's stored journeyType wins when it is a valid journey type; otherwise it is derived from the contact's active deal pipeline and stage. Validate it like any other named lookup.

UPDATING: always fetch the record (get_*/list_*) before update_* so you send correct ids and change only intended fields.`;

export function createMcpServer(authCtx: McpAuthContext): McpServer {
  const server = new McpServer(
    {
      name: "ims-mcp",
      version: getVersion(),
    },
    { instructions: MCP_INSTRUCTIONS },
  );

  // Read / analytics tools.
  registerProductsMcpTools(server, authCtx);
  registerSalesAnalyticsTools(server, authCtx);
  registerInventoryAnalyticsTools(server, authCtx);
  registerCrmAnalyticsTools(server, authCtx);
  registerReportTools(server, authCtx);

  // Create / mutation tools.
  registerProductsCreateMcpTools(server, authCtx);
  registerContactsCreateMcpTools(server, authCtx);
  registerDealsCreateMcpTools(server, authCtx);
  registerActivitiesCreateMcpTools(server, authCtx);
  registerTasksCreateMcpTools(server, authCtx);
  registerInventoryCreateMcpTools(server, authCtx);
  registerCompaniesCreateMcpTools(server, authCtx);
  registerVendorsCreateMcpTools(server, authCtx);
  registerLocationsCreateMcpTools(server, authCtx);
  registerLeadsCreateMcpTools(server, authCtx);
  registerCategoriesCreateMcpTools(server, authCtx);
  registerBundlesCreateMcpTools(server, authCtx);
  registerTransfersCreateMcpTools(server, authCtx);
  registerPromosCreateMcpTools(server, authCtx);
  registerMembersCreateMcpTools(server, authCtx);
  registerPipelinesCreateMcpTools(server, authCtx);
  registerAutomationCreateMcpTools(server, authCtx);
  registerBlogCreateMcpTools(server, authCtx);
  registerPagesCreateMcpTools(server, authCtx);
  registerMediaCreateMcpTools(server, authCtx);

  // Update / read / lookup tools (CRU additions).
  registerCrmSettingsMcpTools(server, authCtx);
  registerContactsUpdateMcpTools(server, authCtx);

  registerYantraPrompts(server);

  return server;
}
