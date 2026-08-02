/**
 * MCP tools — Messaging module (omnichannel inbox: Messenger/IG/etc.).
 * Mirrors GET /messaging/conversations, GET .../:id/messages and
 * POST .../:id/messages. The REST router gates the module behind
 * SETTINGS.MESSAGING.VIEW, so the MCP tools do the same.
 * SendMessageSchema is a ZodEffects (.refine), so send_message exposes an
 * inline shape and re-parses with the real schema.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import messagingService from "@/modules/messaging/messaging.service";
import {
  ConversationQuerySchema,
  MessageQuerySchema,
  SendMessageSchema,
  type SendMessageDto,
} from "@/modules/messaging/messaging.schema";

export function registerMessagingMcpTools(
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
    "list_conversations",
    {
      title: "List conversations",
      description:
        "List inbox conversations (Messenger/Instagram/…), paginated, filterable by status/channel/assignee. Mirrors GET /messaging/conversations.",
      inputSchema: ConversationQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MESSAGING.VIEW");
        const result = await messagingService.getConversations(
          authCtx.tenantId,
          ConversationQuerySchema.parse(query ?? {}),
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_conversations failed");
      }
    },
  );

  registerTool(
    "get_conversation_messages",
    {
      title: "Get conversation messages",
      description:
        "Fetch messages of one conversation (cursor-paginated). Mirrors GET /messaging/conversations/:id/messages. Resolve conversationId via list_conversations first.",
      inputSchema: {
        conversationId: z.string().uuid().describe("Target conversation id"),
        ...MessageQuerySchema.shape,
      },
    },
    async (raw: { conversationId: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MESSAGING.VIEW");
        const { conversationId, ...rest } = raw;
        const result = await messagingService.getMessages(
          authCtx.tenantId,
          conversationId,
          MessageQuerySchema.parse(rest),
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "get_conversation_messages failed");
      }
    },
  );

  registerTool(
    "send_message",
    {
      title: "Send message",
      description:
        "Send a reply into a conversation on its connected channel (text, or media via mediaUrl/mediaAssetId). Mirrors POST /messaging/conversations/:id/messages. This messages a real customer — only send content the user asked you to send.",
      inputSchema: {
        conversationId: z.string().uuid().describe("Target conversation id"),
        text: z.string().min(1).optional(),
        mediaUrl: z.string().url().optional(),
        mediaType: z.enum(["image", "video", "audio", "file"]).optional(),
        mediaAssetId: z.string().uuid().optional(),
        replyToId: z.string().uuid().optional(),
      },
    },
    async (raw: { conversationId: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MESSAGING.VIEW");
        const { conversationId, ...rest } = raw;
        const dto = SendMessageSchema.parse(rest) as SendMessageDto;
        const message = await messagingService.sendMessage(
          authCtx.tenantId,
          conversationId,
          authCtx.userId,
          dto,
        );
        return mcpJsonResponse(message);
      } catch (err) {
        return mcpErrorResponse(err, "send_message failed");
      }
    },
  );
}
