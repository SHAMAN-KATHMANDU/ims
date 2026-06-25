/**
 * Read-only Instagram MCP tools.
 *
 * Instagram Business/Creator accounts are reached through the linked Facebook
 * Page using the SAME Page token ("Instagram API with Facebook Login"). Each
 * tool resolves the Page token + the linked IG account id via
 * resolveInstagramAccount, then calls the IG node on the shared Graph client.
 *
 * Registered from mcp.server.ts via registerInstagramMcpTools(server, authCtx).
 * Every tool is gated on SETTINGS.META.VIEW. Insights default to CURRENT metric
 * names — `views` (not the deprecated `impressions`).
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
import { assertInsightsWindow, metaGraphRequest } from "./meta-graph.client";
import {
  resolveInstagramAccount,
  type ResolvedInstagramAccount,
} from "./meta-graph.token-resolver";

const META_READ_PERM = "SETTINGS.META.VIEW";

// Current (2026) IG metric defaults — `views` replaced the deprecated `impressions`.
const DEFAULT_IG_ACCOUNT_METRICS = "reach,views,follower_count,profile_views";
const DEFAULT_IG_MEDIA_METRICS = "reach,likes,comments,saved,shares";
const IG_PROFILE_FIELDS =
  "id,username,name,followers_count,follows_count,media_count,profile_picture_url,biography,website";
const IG_MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

type QueryMap = Record<string, string | number | boolean | undefined>;

/** Selector inputs shared by every IG tool (which Page/IG account to target). */
const SELECTOR = {
  pageId: z
    .string()
    .optional()
    .describe("Facebook Page id whose linked Instagram account to use"),
  igUserId: z
    .string()
    .optional()
    .describe("Instagram account id (alternative selector)"),
};

export function registerInstagramMcpTools(
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

  /** Resolve IG account → GET a node/edge → respond. The build fn receives the
   *  resolved account (igUserId + pageId) so tools can target either node. */
  const igTool = (
    name: string,
    opts: {
      title: string;
      description: string;
      inputSchema: Record<string, z.ZodTypeAny>;
      build: (
        args: any,
        acc: ResolvedInstagramAccount,
      ) => { path: string; query?: QueryMap };
    },
  ) => {
    registerTool(
      name,
      {
        title: opts.title,
        description: opts.description,
        inputSchema: { ...SELECTOR, ...opts.inputSchema },
      },
      async (args) => {
        try {
          await assertMcpPermission(authCtx, META_READ_PERM);
          const acc = await resolveInstagramAccount(authCtx.tenantId, {
            pageId: args.pageId,
            igUserId: args.igUserId,
          });
          const { path, query } = opts.build(args, acc);
          const data = await metaGraphRequest({
            path,
            token: acc.token,
            appSecret: acc.appSecret,
            version: acc.version,
            query,
          });
          return mcpJsonResponse(data);
        } catch (err) {
          return mcpErrorResponse(err, `${name} failed`);
        }
      },
    );
  };

  // ── Discovery ──────────────────────────────────────────────────────────────
  registerTool(
    "meta_ig_list",
    {
      title: "List connected Instagram accounts",
      description:
        "List the Instagram Business accounts linked to this tenant's connected Pages. Use pageId or igUserId with the other meta_ig_* tools when more than one is connected.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, META_READ_PERM);
        const creds = await metaIntegrationRepository.getCredentialsByKind(
          authCtx.tenantId,
          MetaCredentialKind.PAGE,
        );
        const rows = creds.map((c) => {
          const ig = (c.metadata as Record<string, unknown> | null)
            ?.instagram as { id?: string; username?: string } | undefined;
          return {
            pageId: c.externalId,
            pageName: c.name,
            igUserId: ig?.id ?? null,
            igUsername: ig?.username ?? null,
          };
        });
        return mcpJsonResponse(rows);
      } catch (err) {
        return mcpErrorResponse(err, "meta_ig_list failed");
      }
    },
  );

  // ── Account ────────────────────────────────────────────────────────────────
  igTool("meta_ig_account_get", {
    title: "Get Instagram account profile",
    description:
      "Profile of the linked Instagram Business account (username, name, followers, media count, bio).",
    inputSchema: { fields: z.string().optional() },
    build: (a, acc) => ({
      path: `${acc.igUserId}`,
      query: { fields: a.fields || IG_PROFILE_FIELDS },
    }),
  });

  igTool("meta_ig_account_insights", {
    title: "Instagram account insights",
    description:
      "Account-level insights. Defaults to current metrics (reach, views, follower_count, profile_views) — `impressions` is deprecated, use `views`. Engagement totals (accounts_engaged, total_interactions) need metric_type=total_value. since/until capped at 90 days.",
    inputSchema: {
      metrics: z.string().optional(),
      period: z
        .enum(["day", "week", "days_28", "month", "lifetime"])
        .optional(),
      metric_type: z.enum(["time_series", "total_value"]).optional(),
      since: z.string().optional(),
      until: z.string().optional(),
    },
    build: (a, acc) => {
      assertInsightsWindow(a.since, a.until);
      return {
        path: `${acc.igUserId}/insights`,
        query: {
          metric: a.metrics || DEFAULT_IG_ACCOUNT_METRICS,
          period: a.period || "day",
          metric_type: a.metric_type,
          since: a.since,
          until: a.until,
        },
      };
    },
  });

  // ── Media ──────────────────────────────────────────────────────────────────
  igTool("meta_ig_media_list", {
    title: "List Instagram media",
    description:
      "List the account's media (posts, reels, carousels) newest first.",
    inputSchema: {
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
    },
    build: (a, acc) => ({
      path: `${acc.igUserId}/media`,
      query: {
        fields: a.fields || IG_MEDIA_FIELDS,
        limit: a.limit ?? 25,
        after: a.after,
      },
    }),
  });

  igTool("meta_ig_media_get", {
    title: "Get an Instagram media",
    description: "Fetch one media item by id with its fields.",
    inputSchema: { mediaId: z.string(), fields: z.string().optional() },
    build: (a) => ({
      path: `${a.mediaId}`,
      query: {
        fields:
          a.fields ||
          `${IG_MEDIA_FIELDS},children{id,media_type,media_url,thumbnail_url}`,
      },
    }),
  });

  igTool("meta_ig_media_insights", {
    title: "Instagram media insights",
    description:
      "Per-media insights. Defaults to reach, likes, comments, saved, shares. Add `views` for video/reels (replaces the deprecated impressions); reels also support ig_reels_avg_watch_time, reels_skip_rate.",
    inputSchema: { mediaId: z.string(), metrics: z.string().optional() },
    build: (a) => ({
      path: `${a.mediaId}/insights`,
      query: { metric: a.metrics || DEFAULT_IG_MEDIA_METRICS },
    }),
  });

  igTool("meta_ig_media_comments", {
    title: "List media comments",
    description: "Comments on an Instagram media item.",
    inputSchema: {
      mediaId: z.string(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a) => ({
      path: `${a.mediaId}/comments`,
      query: {
        fields:
          a.fields ||
          "id,text,timestamp,username,like_count,hidden,replies{id,text,username,timestamp}",
        limit: a.limit ?? 25,
      },
    }),
  });

  igTool("meta_ig_comment_replies", {
    title: "List comment replies",
    description: "Replies to a specific Instagram comment.",
    inputSchema: {
      commentId: z.string(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a) => ({
      path: `${a.commentId}/replies`,
      query: {
        fields: a.fields || "id,text,timestamp,username,like_count",
        limit: a.limit ?? 25,
      },
    }),
  });

  igTool("meta_ig_stories", {
    title: "List active stories",
    description: "The account's currently-active stories (available for ~24h).",
    inputSchema: { fields: z.string().optional() },
    build: (a, acc) => ({
      path: `${acc.igUserId}/stories`,
      query: {
        fields:
          a.fields || "id,media_type,media_url,permalink,timestamp,caption",
      },
    }),
  });

  igTool("meta_ig_tags", {
    title: "List media the account is tagged in",
    description: "Media where this Instagram account has been tagged.",
    inputSchema: {
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    build: (a, acc) => ({
      path: `${acc.igUserId}/tags`,
      query: { fields: a.fields || IG_MEDIA_FIELDS, limit: a.limit ?? 25 },
    }),
  });

  // ── Hashtags ───────────────────────────────────────────────────────────────
  igTool("meta_ig_hashtag_search", {
    title: "Search a hashtag id",
    description:
      "Resolve a hashtag name to its id (needed for meta_ig_hashtag_media). Hashtag queries are limited by Meta to 30 unique hashtags per account per 7 days.",
    inputSchema: { query: z.string().describe("Hashtag text, without the #") },
    build: (a, acc) => ({
      path: "ig_hashtag_search",
      query: { user_id: acc.igUserId, q: a.query },
    }),
  });

  igTool("meta_ig_hashtag_media", {
    title: "List media for a hashtag",
    description:
      "Recent or top media for a hashtag id (from meta_ig_hashtag_search).",
    inputSchema: {
      hashtagId: z.string(),
      rank: z.enum(["recent", "top"]).optional(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    build: (a, acc) => ({
      path: `${a.hashtagId}/${a.rank === "top" ? "top_media" : "recent_media"}`,
      query: {
        user_id: acc.igUserId,
        fields:
          a.fields ||
          "id,caption,media_type,permalink,timestamp,like_count,comments_count",
        limit: a.limit ?? 25,
      },
    }),
  });

  // ── Direct messages (read-only) ──────────────────────────────────────────────
  igTool("meta_ig_conversations", {
    title: "List Instagram DM threads",
    description:
      "Read-only Instagram DM conversations for the linked account (via the Page, platform=instagram). Requires instagram_manage_messages.",
    inputSchema: {
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
    },
    build: (a, acc) => ({
      path: `${acc.pageId}/conversations`,
      query: {
        platform: "instagram",
        fields: a.fields || "id,participants,updated_time",
        limit: a.limit ?? 25,
        after: a.after,
      },
    }),
  });

  igTool("meta_ig_conversation_messages", {
    title: "List Instagram DM messages",
    description: "Messages within an Instagram DM conversation.",
    inputSchema: {
      conversationId: z.string(),
      fields: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
    },
    build: (a) => ({
      path: `${a.conversationId}/messages`,
      query: {
        fields: a.fields || "id,created_time,from,to,message,attachments",
        limit: a.limit ?? 25,
        after: a.after,
      },
    }),
  });
}
