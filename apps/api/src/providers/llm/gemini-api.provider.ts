import { wrapGoogleGenAI } from "braintrust";
import * as googleGenAi from "@google/genai";
import { env } from "@/config/env";
import type {
  GenerateReplyInput,
  GenerateReplyResult,
  LlmProviderInterface,
} from "./llm-provider.interface";

const { GoogleGenAI } = wrapGoogleGenAI(googleGenAi);

let client: InstanceType<typeof GoogleGenAI> | null = null;

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.aiReplyApiKey });
  }
  return client;
}

function buildContents(input: GenerateReplyInput): googleGenAi.Content[] {
  const history = input.conversationHistory.slice(-12).map(
    (m): googleGenAi.Content => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }),
  );

  return [...history, { role: "user", parts: [{ text: input.userMessage }] }];
}

export class GeminiApiProvider implements LlmProviderInterface {
  readonly providerName = "GEMINI_API";

  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
    const response = await getClient().models.generateContent({
      model: input.model,
      contents: buildContents(input),
      config: {
        systemInstruction: input.systemPrompt,
        temperature: input.temperature ?? 0.3,
      },
    });

    const text = response.text?.trim() ?? "";
    if (!text) {
      throw new Error("Gemini API returned empty output");
    }

    return { text, raw: response };
  }
}
