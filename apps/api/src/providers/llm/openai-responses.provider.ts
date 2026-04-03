import { env } from "@/config/env";
import type {
  GenerateReplyInput,
  GenerateReplyResult,
  LlmProviderInterface,
} from "./llm-provider.interface";

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

interface ChatCompletionsRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildMessages(
  input: GenerateReplyInput,
): ChatCompletionsRequestMessage[] {
  const historyMessages = input.conversationHistory.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return [
    {
      role: "system",
      content: input.systemPrompt,
    },
    ...historyMessages,
    {
      role: "user",
      content: input.userMessage,
    },
  ];
}

function extractOutputText(body: ChatCompletionsResponse): string {
  const content = body.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const chunks: string[] = [];
    for (const part of content) {
      if (typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
    return chunks.join("").trim();
  }

  return "";
}

export class OpenAIResponsesProvider implements LlmProviderInterface {
  readonly providerName = "OPENAI_COMPAT_CHAT";

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const baseUrl = env.aiReplyBaseUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.aiReplyApiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        temperature: input.temperature ?? 0.3,
        messages: buildMessages(input),
      }),
    });

    const raw = (await response.json()) as ChatCompletionsResponse;
    if (!response.ok) {
      throw new Error(
        `Chat Completions API error (${response.status}): ${JSON.stringify(raw)}`,
      );
    }

    const text = extractOutputText(raw);
    if (!text) {
      throw new Error("Chat Completions API returned empty output");
    }

    return { text, raw };
  }
}
