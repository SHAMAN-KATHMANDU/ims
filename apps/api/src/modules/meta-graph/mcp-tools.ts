/**
 * Read-only Facebook Graph MCP tools (thin generic core + curated helpers).
 *
 * Registered from mcp.server.ts via registerMetaGraphMcpTools(server, authCtx).
 * Credentials are per-tenant, bring-your-own-app, resolved from the encrypted
 * store by meta-graph.token-resolver. Every tool is gated on SETTINGS.META.VIEW.
 *
 * "Thin": meta_graph_get / _get_all / _batch can reach ANY Graph node/edge. The
 * curated tools just preset the right edge + current metric names so the model
 * doesn't have to memorize them (and so deprecated metrics aren't the default).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { MetaCredentialKind } from "@prisma/client";
import metaIntegrationRepository from "@/modules/meta-integration/meta-integration.repository";
import {
  assertInsightsWindow,
  metaGraphGetAll,
  metaGraphRequest,
} from "./meta-graph.client";
import {
  resolveAdsToken,
  resolvePageToken,
  type ResolvedMetaToken,
} from "./meta-graph.token-resolver";

const META_READ_PERM = "SETTINGS.META.VIEW";

// Current (post-June-2026-deprecation) default metric sets. Override via `metrics`.
const DEFAULT_PAGE_METRICS =
  "page_post_engagements,page_follows,page_video_views";
const DEFAULT_POST_METRICS =
  "post_engaged_users,post_clicks,post_reactions_by_type_total";
const DEFAULT_MESSAGING_METRICS =
  "page_messages_total_messaging_connections,page_messages_new_conversations_unique";
const DEFAULT_ADS_INSIGHTS_FIELDS =
  "impressions,reach,spend,clicks,ctr,cpc,cpm,actions";

type QueryMap = Record<string, string | number | boolean | undefined>;

export function registerMetaGraphMcpTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  // Same TS2589 deep-inference workaround used across the MCP modules.
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  const page = (pageId?: string) =>
    resolvePageToken(authCtx.tenantId, { pageId });
  const ads = (adAccountId?: string) =>
    resolveAdsToken(authCtx.tenantId, { adAccountId });

  /** Build common request opts from a resolved token. */
  const reqOpts = (
    t: ResolvedMetaToken,
    path: string,
    query?: QueryMap,
    method: "GET" | "POST" = "GET",
  ) => ({
    path,
    token: t.token,
    appSecret: t.appSecret,
    version: t.version,
    method,
    query,
  });

  /**
   * Declarative registration for the common "resolve token → GET a node/edge →
   * return JSON" shape, so the refined getter tools below stay DRY (one source
   * of truth for the assert/resolve/request/respond boilerplate).
   */
  const readTool = (
    name: string,
    opts: {
      title: string;
      description: string;
      scope: "page" | "ads";
      inputSchema: Record<string, z.ZodTypeAny>;
      build: (
        args: any,
        externalId: string,
      ) => { path: string; query?: QueryMap };
    },
  ) => {
    registerTool(
      name,
      {
        title: opts.title,
        description: opts.description,
        inputSchema: opts.inputSchema,
      },
      async (args) => {
        try {
          await assertMcpPermission(authCtx, META_READ_PERM);
          const t =
            opts.scope === "ads"
              ? await ads(args.adAccountId)
              : await page(args.pageId);
          const { path, query } = opts.build(args, t.externalId);
          const data = await metaGraphRequest(reqOpts(t, path, query));
          return mcpJsonResponse(data);
        } catch (err) {
          return mcpErrorResponse(err, `${name} failed`);
        }
      },
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // GENERIC CORE — the thin escape hatch (reaches any node/edge)
  // ════════════════════════════════════════════════════════════════════════

  registerTool(
    "meta_graph_get",
    {
      title: "Meta Graph GET (generic)",
      description:
        "Call any Facebook Graph node/edge read. Path has no version/leading slash, e.g. '{page-id}/insights', 'me/adaccounts', '<post-id>'. Placeholders {page-id} and {ad-account-id} are substituted from the resolved credential. Use `params` for metric/period/since/until/level/breakdowns/limit/after etc.",
      inputSchema: {
        path: z.string().describe("Graph path, no version or leading slash"),
        fields: z.string().optional().describe("Comma-separated fields"),
        params: z
          .record(z.string())
          .optional()
          .describe(
            "Extra query params (metric, period, level, breakdowns, ...)",
          ),
        tokenScope: z
          .enum(["page", "ads"])
          .optional()
          .describe("Which stored token to use (default page)"),
        pageId: z.string().optional(),
        adAccountId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const scope = args.tokenScope === "ads" ? "ads" : "page";
        const t =
          scope === "ads"
            ? await ads(args.adAccountId)
            : await page(args.pageId);
        const path = substitutePlaceholders(args.path, scope, t.externalId);
        const data = await metaGraphRequest(
          reqOpts(t, path, { ...(args.params ?? {}), fields: args.fields }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_graph_get failed");
      }
    },
  );

  registerTool(
    "meta_graph_get_all",
    {
      title: "Meta Graph GET all pages",
      description:
        "Like meta_graph_get but auto-follows cursor/time pagination up to maxPages, concatenating the data arrays. Reports `truncated` if more remain.",
      inputSchema: {
        path: z.string(),
        fields: z.string().optional(),
        params: z.record(z.string()).optional(),
        tokenScope: z.enum(["page", "ads"]).optional(),
        pageId: z.string().optional(),
        adAccountId: z.string().optional(),
        maxPages: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const scope = args.tokenScope === "ads" ? "ads" : "page";
        const t =
          scope === "ads"
            ? await ads(args.adAccountId)
            : await page(args.pageId);
        const path = substitutePlaceholders(args.path, scope, t.externalId);
        const data = await metaGraphGetAll(
          reqOpts(t, path, { ...(args.params ?? {}), fields: args.fields }),
          args.maxPages ?? 10,
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_graph_get_all failed");
      }
    },
  );

  registerTool(
    "meta_graph_batch",
    {
      title: "Meta Graph batch (GET only)",
      description:
        "Run up to 50 GET reads in one Graph batch request. Each item is a relative_url like '{page-id}/insights?metric=page_follows'. Read-only: only GET is allowed.",
      inputSchema: {
        requests: z
          .array(z.object({ relativeUrl: z.string() }))
          .min(1)
          .max(50),
        tokenScope: z.enum(["page", "ads"]).optional(),
        pageId: z.string().optional(),
        adAccountId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const scope = args.tokenScope === "ads" ? "ads" : "page";
        const t =
          scope === "ads"
            ? await ads(args.adAccountId)
            : await page(args.pageId);
        const batch = (args.requests as Array<{ relativeUrl: string }>).map(
          (r) => ({
            method: "GET",
            relative_url: substitutePlaceholders(
              r.relativeUrl,
              scope,
              t.externalId,
            ),
          }),
        );
        const data = await metaGraphRequest(
          reqOpts(t, "", { batch: JSON.stringify(batch) }, "POST"),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_graph_batch failed");
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  // PAGE & POSTS
  // ════════════════════════════════════════════════════════════════════════

  registerTool(
    "meta_page_list",
    {
      title: "List connected Facebook Pages",
      description:
        "List the Pages this tenant has configured (id + label). Use the pageId with the other page/message tools when more than one is connected.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const creds = await metaIntegrationRepository.getCredentialsByKind(
          authCtx.tenantId,
          MetaCredentialKind.PAGE,
        );
        return mcpJsonResponse(
          creds.map((c) => ({ pageId: c.externalId, name: c.name })),
        );
      } catch (err) {
        return mcpErrorResponse(err, "meta_page_list failed");
      }
    },
  );

  registerTool(
    "meta_page_insights",
    {
      title: "Page insights",
      description:
        "Page-level insights. Defaults to current metrics (page_post_engagements, page_follows, page_video_views) — the old page_impressions/page_fans are deprecated. Pass `metrics` to override. since/until is capped at 90 days.",
      inputSchema: {
        pageId: z.string().optional(),
        metrics: z.string().optional().describe("Comma-separated metric names"),
        period: z
          .enum([
            "day",
            "week",
            "days_28",
            "month",
            "lifetime",
            "total_over_range",
          ])
          .optional(),
        since: z.string().optional().describe("Unix seconds or ISO date"),
        until: z.string().optional().describe("Unix seconds or ISO date"),
        datePreset: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        assertInsightsWindow(args.since, args.until);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/insights`, {
            metric: args.metrics || DEFAULT_PAGE_METRICS,
            period: args.period,
            since: args.since,
            until: args.until,
            date_preset: args.datePreset,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_page_insights failed");
      }
    },
  );

  registerTool(
    "meta_post_list",
    {
      title: "List page posts",
      description:
        "List the Page's published posts (most recent first). Use a returned post id with meta_post_insights.",
      inputSchema: {
        pageId: z.string().optional(),
        fields: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/published_posts`, {
            fields:
              args.fields ||
              "id,message,created_time,permalink_url,status_type",
            limit: args.limit ?? 25,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_post_list failed");
      }
    },
  );

  registerTool(
    "meta_post_insights",
    {
      title: "Post insights",
      description:
        "Insights for a single post. Defaults to current metrics (post_engaged_users, post_clicks, post_reactions_by_type_total) — post_impressions is deprecated (use 'views'). Pass `metrics` to override.",
      inputSchema: {
        postId: z.string(),
        pageId: z.string().optional(),
        metrics: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.postId}/insights`, {
            metric: args.metrics || DEFAULT_POST_METRICS,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_post_insights failed");
      }
    },
  );

  registerTool(
    "meta_page_get",
    {
      title: "Get page details",
      description:
        "Fetch the Page node — name, category, follower count, link, about. Pass `fields` to override the defaults.",
      inputSchema: {
        pageId: z.string().optional(),
        fields: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}`, {
            fields:
              args.fields ||
              "id,name,category,followers_count,fan_count,link,about,verification_status",
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_page_get failed");
      }
    },
  );

  registerTool(
    "meta_post_comments",
    {
      title: "List post comments",
      description: "List comments on a Page post (newest first by default).",
      inputSchema: {
        postId: z.string(),
        pageId: z.string().optional(),
        fields: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.postId}/comments`, {
            fields:
              args.fields ||
              "id,from,message,created_time,like_count,comment_count",
            limit: args.limit ?? 25,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_post_comments failed");
      }
    },
  );

  registerTool(
    "meta_webhook_subscriptions",
    {
      title: "Page webhook subscriptions",
      description:
        "Show which apps/fields the Page is subscribed to — useful to confirm the Messenger inbox webhook is wired.",
      inputSchema: { pageId: z.string().optional() },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/subscribed_apps`),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_webhook_subscriptions failed");
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  // MESSAGING (conversations + messages + messaging insights)
  // ════════════════════════════════════════════════════════════════════════

  registerTool(
    "meta_conversation_list",
    {
      title: "List page conversations",
      description:
        "List Messenger conversations for the Page. Default fields: id, participants, updated_time. Add fields like 'snippet,unread_count,message_count' if your Page/API version supports them.",
      inputSchema: {
        pageId: z.string().optional(),
        fields: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/conversations`, {
            fields: args.fields || "id,participants,updated_time",
            limit: args.limit ?? 25,
            after: args.after,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_conversation_list failed");
      }
    },
  );

  registerTool(
    "meta_conversation_messages",
    {
      title: "List conversation messages",
      description:
        "List messages within a conversation (newest first; ~20 by default). Use a conversation id from meta_conversation_list.",
      inputSchema: {
        conversationId: z.string(),
        pageId: z.string().optional(),
        fields: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.conversationId}/messages`, {
            fields:
              args.fields || "id,created_time,from,to,message,attachments",
            limit: args.limit ?? 25,
            after: args.after,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_conversation_messages failed");
      }
    },
  );

  registerTool(
    "meta_message_get",
    {
      title: "Get a message",
      description: "Fetch a single Messenger message by id with its details.",
      inputSchema: {
        messageId: z.string(),
        pageId: z.string().optional(),
        fields: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.messageId}`, {
            fields:
              args.fields || "id,created_time,from,to,message,attachments,tags",
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_message_get failed");
      }
    },
  );

  registerTool(
    "meta_messaging_insights",
    {
      title: "Messaging insights",
      description:
        "Page messaging metrics via the insights edge. Availability of specific messaging metrics varies by API version; pass `metrics` to target ones your Page supports.",
      inputSchema: {
        pageId: z.string().optional(),
        metrics: z.string().optional(),
        period: z
          .enum(["day", "week", "days_28", "month", "lifetime"])
          .optional(),
        since: z.string().optional(),
        until: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        assertInsightsWindow(args.since, args.until);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/insights`, {
            metric: args.metrics || DEFAULT_MESSAGING_METRICS,
            period: args.period,
            since: args.since,
            until: args.until,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_messaging_insights failed");
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  // LABELS (Messenger custom labels + Marketing API ad labels)
  // ════════════════════════════════════════════════════════════════════════

  registerTool(
    "meta_custom_labels_list",
    {
      title: "List Messenger custom labels",
      description:
        "List the Page's Messenger custom labels (id + page_label_name) used to tag conversations/people in the inbox.",
      inputSchema: { pageId: z.string().optional() },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${t.externalId}/custom_labels`, {
            fields: "id,page_label_name",
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_custom_labels_list failed");
      }
    },
  );

  registerTool(
    "meta_user_custom_labels",
    {
      title: "List a user's custom labels",
      description:
        "List the Messenger custom labels applied to a specific person (PSID).",
      inputSchema: {
        psid: z.string().describe("Page-scoped user id"),
        pageId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await page(args.pageId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.psid}/custom_labels`, {
            fields: "id,page_label_name",
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_user_custom_labels failed");
      }
    },
  );

  registerTool(
    "meta_adlabels_list",
    {
      title: "List ad labels",
      description:
        "List the ad account's Marketing-API ad labels (adlabels: id + name) used to organize campaigns/ad sets/ads.",
      inputSchema: { adAccountId: z.string().optional() },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const data = await metaGraphRequest(
          reqOpts(t, `act_${t.externalId}/adlabels`, { fields: "id,name" }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_adlabels_list failed");
      }
    },
  );

  registerTool(
    "meta_adlabel_objects",
    {
      title: "List objects under an ad label",
      description:
        "List the campaigns / ad sets / ads / creatives associated with an ad label.",
      inputSchema: {
        adLabelId: z.string(),
        type: z.enum(["ads", "campaigns", "adsets", "adcreatives"]).optional(),
        adAccountId: z.string().optional(),
        fields: z.string().optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const data = await metaGraphRequest(
          reqOpts(t, `${args.adLabelId}/${args.type || "ads"}`, {
            fields: args.fields || "id,name,status",
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_adlabel_objects failed");
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  // ADS (Marketing API: objects + insights, sync & async)
  // ════════════════════════════════════════════════════════════════════════

  registerTool(
    "meta_ad_accounts_list",
    {
      title: "List connected ad accounts",
      description:
        "List the ad accounts this tenant has configured (id + label). Use the adAccountId with the other ads tools when more than one is connected.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const creds = await metaIntegrationRepository.getCredentialsByKind(
          authCtx.tenantId,
          MetaCredentialKind.ADS,
        );
        return mcpJsonResponse(
          creds.map((c) => ({ adAccountId: c.externalId, name: c.name })),
        );
      } catch (err) {
        return mcpErrorResponse(err, "meta_ad_accounts_list failed");
      }
    },
  );

  registerTool(
    "meta_ad_objects_list",
    {
      title: "List ad objects",
      description:
        "List campaigns / ad sets / ads / ad creatives under the ad account.",
      inputSchema: {
        adAccountId: z.string().optional(),
        level: z.enum(["campaigns", "adsets", "ads", "adcreatives"]).optional(),
        fields: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const level = args.level || "campaigns";
        const data = await metaGraphRequest(
          reqOpts(t, `act_${t.externalId}/${level}`, {
            fields: args.fields || defaultAdObjectFields(level),
            limit: args.limit ?? 50,
          }),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_ad_objects_list failed");
      }
    },
  );

  registerTool(
    "meta_ads_insights",
    {
      title: "Ads insights (synchronous)",
      description:
        "Ad performance from the Insights API. Targets the ad account by default, or a specific objectId (campaign/ad set/ad). Default fields: impressions, reach, spend, clicks, ctr, cpc, cpm, actions. Use meta_ads_insights_submit/_poll for heavy queries.",
      inputSchema: {
        adAccountId: z.string().optional(),
        objectId: z
          .string()
          .optional()
          .describe("Campaign/ad set/ad id; omit to query the whole account"),
        level: z.enum(["account", "campaign", "adset", "ad"]).optional(),
        fields: z.string().optional(),
        datePreset: z.string().optional(),
        timeRange: z
          .object({ since: z.string(), until: z.string() })
          .optional(),
        timeIncrement: z.string().optional(),
        breakdowns: z.string().optional(),
        actionBreakdowns: z.string().optional(),
        filtering: z.array(z.record(z.any())).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const target = args.objectId || `act_${t.externalId}`;
        const data = await metaGraphRequest(
          reqOpts(t, `${target}/insights`, adsInsightsQuery(args)),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_ads_insights failed");
      }
    },
  );

  registerTool(
    "meta_ads_insights_submit",
    {
      title: "Ads insights — submit async report",
      description:
        "Submit an asynchronous Ads Insights report for heavy/filtered queries. Returns a report_run_id; poll it with meta_ads_insights_poll.",
      inputSchema: {
        adAccountId: z.string().optional(),
        objectId: z.string().optional(),
        level: z.enum(["account", "campaign", "adset", "ad"]).optional(),
        fields: z.string().optional(),
        datePreset: z.string().optional(),
        timeRange: z
          .object({ since: z.string(), until: z.string() })
          .optional(),
        timeIncrement: z.string().optional(),
        breakdowns: z.string().optional(),
        actionBreakdowns: z.string().optional(),
        filtering: z.array(z.record(z.any())).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const target = args.objectId || `act_${t.externalId}`;
        const data = await metaGraphRequest(
          reqOpts(t, `${target}/insights`, adsInsightsQuery(args), "POST"),
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "meta_ads_insights_submit failed");
      }
    },
  );

  registerTool(
    "meta_ads_insights_poll",
    {
      title: "Ads insights — poll async report",
      description:
        "Check an async Ads Insights report. Returns its status/percent; when complete, also returns the results page.",
      inputSchema: {
        reportRunId: z.string(),
        adAccountId: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const t = await ads(args.adAccountId);
        const status = await metaGraphRequest<{
          async_status?: string;
          async_percent_completion?: number;
        }>(
          reqOpts(t, `${args.reportRunId}`, {
            fields: "async_status,async_percent_completion",
          }),
        );
        const done = status.async_status === "Job Completed";
        const results = done
          ? await metaGraphRequest(
              reqOpts(t, `${args.reportRunId}/insights`, {
                limit: args.limit ?? 100,
              }),
            )
          : undefined;
        return mcpJsonResponse({
          status: status.async_status,
          percent: status.async_percent_completion,
          done,
          results,
        });
      } catch (err) {
        return mcpErrorResponse(err, "meta_ads_insights_poll failed");
      }
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  // REFINED GETTERS (read-only) — per-object detail + more page/ads/business edges
  // ════════════════════════════════════════════════════════════════════════

  // — Page content & detail —
  readTool("meta_post_get", {
    title: "Get a post",
    description:
      "Fetch one Page post with engagement summaries (reactions/comments/shares) and attachments.",
    scope: "page",
    inputSchema: {
      postId: z.string(),
      pageId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.postId}`,
      query: {
        fields:
          a.fields ||
          "id,message,story,created_time,permalink_url,status_type,is_published,shares,reactions.summary(true),comments.summary(true),attachments",
      },
    }),
  });

  readTool("meta_post_reactions", {
    title: "List post reactions",
    description:
      "Reactions on a post with a total count; optionally filter by type (LIKE, LOVE, WOW, HAHA, SAD, ANGRY, CARE).",
    scope: "page",
    inputSchema: {
      postId: z.string(),
      pageId: z.string().optional(),
      type: z
        .enum(["LIKE", "LOVE", "WOW", "HAHA", "SAD", "ANGRY", "CARE", "NONE"])
        .optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a) => ({
      path: `${a.postId}/reactions`,
      query: { type: a.type, summary: "total_count", limit: a.limit ?? 25 },
    }),
  });

  readTool("meta_page_feed", {
    title: "List page feed",
    description:
      "The Page feed (the Page's posts plus, where enabled, visitor posts). Use meta_post_list for only the Page's own published posts.",
    scope: "page",
    inputSchema: {
      pageId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
    },
    build: (a, ext) => ({
      path: `${ext}/feed`,
      query: {
        fields:
          a.fields ||
          "id,message,story,created_time,permalink_url,from,status_type",
        limit: a.limit ?? 25,
        after: a.after,
      },
    }),
  });

  readTool("meta_page_ratings", {
    title: "List page ratings/reviews",
    description: "Recommendations and reviews left on the Page.",
    scope: "page",
    inputSchema: {
      pageId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a, ext) => ({
      path: `${ext}/ratings`,
      query: {
        fields:
          a.fields ||
          "created_time,rating,review_text,recommendation_type,reviewer,open_graph_story",
        limit: a.limit ?? 25,
      },
    }),
  });

  readTool("meta_page_photos", {
    title: "List page photos",
    description:
      "Photos on the Page. type=uploaded (default) for the Page's own photos, or tagged.",
    scope: "page",
    inputSchema: {
      pageId: z.string().optional(),
      type: z.enum(["uploaded", "tagged"]).optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a, ext) => ({
      path: `${ext}/photos`,
      query: {
        type: a.type || "uploaded",
        fields: a.fields || "id,created_time,name,link,images",
        limit: a.limit ?? 25,
      },
    }),
  });

  readTool("meta_page_videos", {
    title: "List page videos",
    description: "Videos uploaded to the Page.",
    scope: "page",
    inputSchema: {
      pageId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a, ext) => ({
      path: `${ext}/videos`,
      query: {
        fields:
          a.fields ||
          "id,title,description,created_time,length,permalink_url,views",
        limit: a.limit ?? 25,
      },
    }),
  });

  readTool("meta_video_insights", {
    title: "Video insights",
    description:
      "Insights for a single video. Pass `metrics` to target the ones you need; defaults to common view metrics.",
    scope: "page",
    inputSchema: {
      videoId: z.string(),
      pageId: z.string().optional(),
      metrics: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.videoId}/video_insights`,
      query: {
        metric:
          a.metrics ||
          "total_video_views,total_video_impressions,total_video_avg_time_watched",
      },
    }),
  });

  readTool("meta_page_roles", {
    title: "List page roles",
    description: "People with a role on the Page (admins, editors, etc.).",
    scope: "page",
    inputSchema: { pageId: z.string().optional() },
    build: (_a, ext) => ({
      path: `${ext}/roles`,
      query: { fields: "id,name,role,tasks" },
    }),
  });

  readTool("meta_comment_replies", {
    title: "List comment replies",
    description: "Replies to a specific comment (nested comments).",
    scope: "page",
    inputSchema: {
      commentId: z.string(),
      pageId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a) => ({
      path: `${a.commentId}/comments`,
      query: {
        fields: a.fields || "id,from,message,created_time,like_count",
        limit: a.limit ?? 25,
      },
    }),
  });

  // — Messaging detail —
  readTool("meta_conversation_get", {
    title: "Get a conversation",
    description:
      "Details of one Messenger conversation (participants, counts, link, last update).",
    scope: "page",
    inputSchema: {
      conversationId: z.string(),
      pageId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.conversationId}`,
      query: {
        fields:
          a.fields ||
          "id,participants,can_reply,message_count,unread_count,link,updated_time,senders",
      },
    }),
  });

  readTool("meta_messaging_profile", {
    title: "Get a messaging user's profile",
    description:
      "Profile of a person you're messaging (by PSID), fetched with the Page token.",
    scope: "page",
    inputSchema: {
      psid: z.string().describe("Page-scoped user id"),
      pageId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.psid}`,
      query: {
        fields:
          a.fields || "first_name,last_name,profile_pic,locale,timezone,gender",
      },
    }),
  });

  // — Ads detail (Marketing API) —
  readTool("meta_ad_account_get", {
    title: "Get ad account details",
    description:
      "Ad account fields: currency, status, spend, balance, spend cap, timezone, business.",
    scope: "ads",
    inputSchema: {
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a, ext) => ({
      path: `act_${ext}`,
      query: {
        fields:
          a.fields ||
          "id,name,account_status,currency,amount_spent,balance,spend_cap,timezone_name,business,funding_source_details",
      },
    }),
  });

  readTool("meta_campaign_get", {
    title: "Get a campaign",
    description:
      "Fields for one campaign (status, objective, budgets, schedule, special ad categories).",
    scope: "ads",
    inputSchema: {
      campaignId: z.string(),
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.campaignId}`,
      query: {
        fields:
          a.fields ||
          "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,special_ad_categories",
      },
    }),
  });

  readTool("meta_adset_get", {
    title: "Get an ad set",
    description: "Fields for one ad set, including targeting and optimization.",
    scope: "ads",
    inputSchema: {
      adsetId: z.string(),
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.adsetId}`,
      query: {
        fields:
          a.fields ||
          "id,name,status,effective_status,campaign_id,optimization_goal,billing_event,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting",
      },
    }),
  });

  readTool("meta_ad_get", {
    title: "Get an ad",
    description:
      "Fields for one ad, including its creative reference and effective status.",
    scope: "ads",
    inputSchema: {
      adId: z.string(),
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.adId}`,
      query: {
        fields:
          a.fields ||
          "id,name,status,effective_status,adset_id,campaign_id,creative,tracking_specs",
      },
    }),
  });

  readTool("meta_adcreative_get", {
    title: "Get an ad creative",
    description:
      "Fields for one ad creative (object_story_spec, media, copy, CTA).",
    scope: "ads",
    inputSchema: {
      creativeId: z.string(),
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.creativeId}`,
      query: {
        fields:
          a.fields ||
          "id,name,object_story_spec,thumbnail_url,image_url,body,title,call_to_action_type,effective_object_story_id",
      },
    }),
  });

  readTool("meta_custom_audiences_list", {
    title: "List custom audiences",
    description:
      "Custom audiences on the ad account (size estimates, subtype, status).",
    scope: "ads",
    inputSchema: {
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
    build: (a, ext) => ({
      path: `act_${ext}/customaudiences`,
      query: {
        fields:
          a.fields ||
          "id,name,subtype,description,approximate_count_lower_bound,approximate_count_upper_bound,operation_status,delivery_status,time_created",
        limit: a.limit ?? 50,
      },
    }),
  });

  readTool("meta_ad_account_activities", {
    title: "Ad account activity log",
    description:
      "Change-history events on the ad account (who changed what, when).",
    scope: "ads",
    inputSchema: {
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
      since: z.string().optional(),
      until: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
    build: (a, ext) => ({
      path: `act_${ext}/activities`,
      query: {
        fields:
          a.fields ||
          "event_type,event_time,actor_name,object_name,object_id,extra_data",
        since: a.since,
        until: a.until,
        limit: a.limit ?? 50,
      },
    }),
  });

  readTool("meta_ad_rules", {
    title: "List automated ad rules",
    description:
      "Automated rules library for the ad account (evaluation + execution specs).",
    scope: "ads",
    inputSchema: {
      adAccountId: z.string().optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
    build: (a, ext) => ({
      path: `act_${ext}/adrules_library`,
      query: {
        fields:
          a.fields ||
          "id,name,status,evaluation_spec,execution_spec,schedule_spec,created_time",
        limit: a.limit ?? 50,
      },
    }),
  });

  readTool("meta_businesses_list", {
    title: "List businesses",
    description: "Business Manager accounts reachable by the Ads token.",
    scope: "ads",
    inputSchema: {
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a) => ({
      path: "me/businesses",
      query: {
        fields: a.fields || "id,name,verification_status,created_time",
        limit: a.limit ?? 25,
      },
    }),
  });
}

// ── helpers ───────────────────────────────────────────────────────────────

/** Substitute {page-id}/{ad-account-id} placeholders with the resolved id. */
function substitutePlaceholders(
  path: string,
  scope: "page" | "ads",
  externalId: string,
): string {
  // Only substitute the placeholder that matches the selected token scope, so a
  // {page-id} in an ads-scoped path isn't filled with an ad-account id (or vice-versa).
  if (scope === "page") {
    return path.replace(/\{page[-_]id\}/gi, externalId);
  }
  return path
    .replace(/act_\{ad[-_]account[-_]id\}/gi, `act_${externalId}`)
    .replace(/\{ad[-_]account[-_]id\}/gi, `act_${externalId}`)
    .replace(/act_act_/gi, "act_");
}

function defaultAdObjectFields(level: string): string {
  switch (level) {
    case "campaigns":
      return "id,name,status,objective,daily_budget,lifetime_budget";
    case "adsets":
      return "id,name,status,campaign_id,daily_budget,optimization_goal";
    case "ads":
      return "id,name,status,adset_id,creative";
    case "adcreatives":
      return "id,name,object_type,thumbnail_url";
    default:
      return "id,name,status";
  }
}

function adsInsightsQuery(args: {
  fields?: string;
  level?: string;
  datePreset?: string;
  timeRange?: { since: string; until: string };
  timeIncrement?: string;
  breakdowns?: string;
  actionBreakdowns?: string;
  filtering?: Array<Record<string, unknown>>;
  limit?: number;
}): QueryMap {
  return {
    fields: args.fields || DEFAULT_ADS_INSIGHTS_FIELDS,
    level: args.level,
    date_preset: args.datePreset,
    time_range: args.timeRange ? JSON.stringify(args.timeRange) : undefined,
    time_increment: args.timeIncrement,
    breakdowns: args.breakdowns,
    action_breakdowns: args.actionBreakdowns,
    filtering: args.filtering ? JSON.stringify(args.filtering) : undefined,
    limit: args.limit,
  };
}
