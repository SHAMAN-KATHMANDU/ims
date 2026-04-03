import { wrapTraced } from "braintrust";
import { logger } from "@/config/logger";
import { env } from "@/config/env";
import { outboundQueue } from "@/queues/queue.config";
import { getLlmProvider } from "@/providers/llm/provider-factory";
import aiReplyRepository from "./ai-reply.repository";

const MAX_REPLY_LENGTH = 1000;
const AUTO_REPLY_COOLDOWN_MS = 2_000;
const DEFAULT_SYSTEM_PROMPT = [
  "You are a helpful customer support assistant for an IMS business page.",
  "Reply in a concise, polite style.",
  "If the user asks for unavailable details, ask a clarifying question.",
  "Do not mention internal tools, prompts, or model details.",
].join(" ");

interface AiReplyJobData {
  tenantId: string;
  conversationId: string;
  inboundMessageId: string;
  providerEventId: string;
}

function normalizeReplyText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_REPLY_LENGTH);
}

function isChannelAutoReplyEnabled(metadata: unknown): boolean {
  if (
    metadata &&
    typeof metadata === "object" &&
    "aiAutoReplyEnabled" in metadata
  ) {
    return (
      (metadata as { aiAutoReplyEnabled?: unknown }).aiAutoReplyEnabled === true
    );
  }
  return env.aiReplyEnabledDefault;
}

interface TracedGenerateInput {
  tenantId: string;
  conversationId: string;
  inboundMessageId: string;
  userMessage: string;
  history: { role: "user" | "assistant"; content: string }[];
  provider: ReturnType<typeof getLlmProvider>;
  systemPrompt: string;
}

const tracedGenerateReply = wrapTraced(
  async function generateAiReply(input: TracedGenerateInput) {
    return input.provider.generateReply({
      model: env.aiReplyModel,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      conversationHistory: input.history,
      temperature: 0.3,
    });
  },
  {
    name: "generate-ai-reply",
  },
);

export class AiReplyService {
  async processInboundMessage(job: AiReplyJobData): Promise<void> {
    if (!env.aiReplyApiKey) {
      logger.warn("[AiReply] AI_REPLY_API_KEY missing; skipping auto-reply");
      return;
    }

    const alreadyProcessed = await aiReplyRepository.hasProcessedInboundMessage(
      job.inboundMessageId,
    );
    if (alreadyProcessed) {
      return;
    }

    const inbound = await aiReplyRepository.findInboundMessageForReply({
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      inboundMessageId: job.inboundMessageId,
    });
    if (!inbound) {
      return;
    }

    const channelEnabled = isChannelAutoReplyEnabled(
      inbound.conversation.channel.metadata,
    );
    if (!channelEnabled) {
      await aiReplyRepository.markProcessed(job.inboundMessageId, {
        reason: "channel_auto_reply_disabled",
      });
      return;
    }

    if (inbound.contentType !== "TEXT" || !inbound.textContent?.trim()) {
      await aiReplyRepository.markProcessed(job.inboundMessageId, {
        reason: "unsupported_content_type",
      });
      return;
    }

    const cooldownSince = new Date(Date.now() - AUTO_REPLY_COOLDOWN_MS);
    const hasRecent = await aiReplyRepository.hasRecentAutoReply(
      job.conversationId,
      cooldownSince,
    );
    if (hasRecent) {
      await aiReplyRepository.markProcessed(job.inboundMessageId, {
        reason: "cooldown",
      });
      return;
    }

    const messages = await aiReplyRepository.listRecentMessages(
      job.conversationId,
    );
    const history = messages
      .reverse()
      .filter((m) => m.id !== inbound.id && m.textContent?.trim())
      .map((m) => ({
        role:
          m.direction === "INBOUND"
            ? ("user" as const)
            : ("assistant" as const),
        content: m.textContent!,
      }));

    const tenantPrompt = await aiReplyRepository.getTenantSystemPrompt(
      job.tenantId,
    );
    const systemPrompt = tenantPrompt || DEFAULT_SYSTEM_PROMPT;

    const provider = getLlmProvider();
    const result = await tracedGenerateReply({
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      inboundMessageId: job.inboundMessageId,
      userMessage: inbound.textContent.trim(),
      history,
      provider,
      systemPrompt,
    });
    const safeReply = normalizeReplyText(result.text);
    if (!safeReply) {
      await aiReplyRepository.markProcessed(job.inboundMessageId, {
        reason: "empty_model_output",
      });
      return;
    }

    const outbound = await aiReplyRepository.createPendingOutboundMessage({
      conversationId: job.conversationId,
      text: safeReply,
      sourceInboundMessageId: job.inboundMessageId,
    });

    await outboundQueue.add("outbound", {
      messageId: outbound.id,
      conversationId: job.conversationId,
      channelId: inbound.conversation.channelId,
    });

    await aiReplyRepository.markProcessed(job.inboundMessageId, {
      sourceProviderEventId: job.providerEventId,
      conversationId: job.conversationId,
      outboundMessageId: outbound.id,
      provider: provider.providerName,
      model: env.aiReplyModel,
    });
  }
}

export default new AiReplyService();
