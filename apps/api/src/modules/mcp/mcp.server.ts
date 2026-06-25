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
import { registerDealsUpdateMcpTools } from "@/modules/deals/mcp-tools-update";
import { registerTasksUpdateMcpTools } from "@/modules/tasks/mcp-tools-update";
import { registerLeadsUpdateMcpTools } from "@/modules/leads/mcp-tools-update";
import { registerActivitiesReadMcpTools } from "@/modules/activities/mcp-tools-read";
import { registerCompaniesUpdateMcpTools } from "@/modules/companies/mcp-tools-update";
import { registerMembersUpdateMcpTools } from "@/modules/members/mcp-tools-update";
import { registerVendorsUpdateMcpTools } from "@/modules/vendors/mcp-tools-update";
import { registerLocationsUpdateMcpTools } from "@/modules/locations/mcp-tools-update";
import { registerCategoriesUpdateMcpTools } from "@/modules/categories/mcp-tools-update";
import { registerPipelinesReadMcpTools } from "@/modules/pipelines/mcp-tools-read";
import { registerProductsUpdateMcpTools } from "@/modules/products/mcp-tools-update";
import { registerPromosUpdateMcpTools } from "@/modules/promos/mcp-tools-update";
import { registerBundlesUpdateMcpTools } from "@/modules/bundles/mcp-tools-update";
import { registerBlogUpdateMcpTools } from "@/modules/blog/mcp-tools-update";
import { registerPagesUpdateMcpTools } from "@/modules/pages/mcp-tools-update";
import { registerAutomationUpdateMcpTools } from "@/modules/automation/mcp-tools-update";
import { registerMediaUpdateMcpTools } from "@/modules/media/mcp-tools-update";

// Read-only Facebook Graph (Meta) tools — page/post/message insights, labels, ads.
import { registerMetaGraphMcpTools } from "@/modules/meta-graph/mcp-tools";
import { registerInstagramMcpTools } from "@/modules/meta-graph/mcp-tools-instagram";

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

UPDATING: always fetch the record (get_*/list_*) before update_* so you send correct ids and change only intended fields.

META / FACEBOOK GRAPH (read-only meta_* tools — page/post/message insights, labels, ads):
- Credentials are per-tenant and configured by the tenant in Settings → Facebook / Meta. If a tool reports the integration is not configured, tell the user to add their Facebook App + Page/Ads tokens there; do not invent credentials.
- Resolve selectors first when more than one is connected: call meta_page_list for a pageId and meta_ad_accounts_list for an adAccountId. An "availableOptions" error means you must pick one of those ids and retry.
- Use CURRENT metric names. The old page_impressions / post_impressions / impressions / page_fans metrics were deprecated (June 2026); prefer views, page_follows, page_media_view, page_post_engagements, post_engaged_users. The curated tools already default to valid metrics — pass metrics only to override.
- Page/post insights since/until windows are capped at 90 days per request.
- For heavy or broken-down ads reports use meta_ads_insights_submit then meta_ads_insights_poll (async); meta_ads_insights is for quick synchronous queries.
- meta_graph_get / meta_graph_get_all / meta_graph_batch are the generic escape hatch for any endpoint not covered by a curated tool; {page-id} and {ad-account-id} in the path are substituted from the selected credential.

INSTAGRAM (read-only meta_ig_* tools — profile, media, insights, comments, hashtags, DM threads):
- Instagram Business/Creator accounts are reached through the linked Facebook Page (same Page token). The Page must have a linked IG account and the token must carry the instagram_* scopes. Call meta_ig_list first to see connected IG accounts and to get a pageId/igUserId selector.
- Use CURRENT IG metric names: prefer views (the old impressions is deprecated). Account engagement totals (accounts_engaged, total_interactions) require metric_type=total_value. Insights since/until are capped at 90 days.
- A "no linked Instagram Business account" error means the chosen Page has no IG account linked — tell the user to link one in the Page's settings.`;

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
  registerDealsUpdateMcpTools(server, authCtx);
  registerTasksUpdateMcpTools(server, authCtx);
  registerLeadsUpdateMcpTools(server, authCtx);
  registerActivitiesReadMcpTools(server, authCtx);
  registerCompaniesUpdateMcpTools(server, authCtx);
  registerMembersUpdateMcpTools(server, authCtx);
  registerVendorsUpdateMcpTools(server, authCtx);
  registerLocationsUpdateMcpTools(server, authCtx);
  registerCategoriesUpdateMcpTools(server, authCtx);
  registerPipelinesReadMcpTools(server, authCtx);
  registerProductsUpdateMcpTools(server, authCtx);
  registerPromosUpdateMcpTools(server, authCtx);
  registerBundlesUpdateMcpTools(server, authCtx);
  registerBlogUpdateMcpTools(server, authCtx);
  registerPagesUpdateMcpTools(server, authCtx);
  registerAutomationUpdateMcpTools(server, authCtx);
  registerMediaUpdateMcpTools(server, authCtx);

  // Meta / Facebook Graph (read-only).
  registerMetaGraphMcpTools(server, authCtx);
  // Instagram (read-only, via the linked Page token).
  registerInstagramMcpTools(server, authCtx);

  registerYantraPrompts(server);

  return server;
}
