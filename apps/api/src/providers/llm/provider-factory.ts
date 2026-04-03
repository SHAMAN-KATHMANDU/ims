import { env } from "@/config/env";
import type { LlmProviderInterface } from "./llm-provider.interface";
import { OpenAIResponsesProvider } from "./openai-responses.provider";
import { GeminiApiProvider } from "./gemini-api.provider";

let openAiResponsesProvider: OpenAIResponsesProvider | null = null;
let geminiApiProvider: GeminiApiProvider | null = null;

export function getLlmProvider(): LlmProviderInterface {
  switch (env.aiReplyProvider) {
    case "OPENAI_RESPONSES":
    case "OPENAI_COMPAT_CHAT": {
      if (!openAiResponsesProvider) {
        openAiResponsesProvider = new OpenAIResponsesProvider();
      }
      return openAiResponsesProvider;
    }
    case "GEMINI_API": {
      if (!geminiApiProvider) {
        geminiApiProvider = new GeminiApiProvider();
      }
      return geminiApiProvider;
    }
    default:
      throw new Error(`Unsupported AI reply provider: ${env.aiReplyProvider}`);
  }
}
