export interface LlmChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateReplyInput {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: LlmChatMessage[];
  model: string;
  temperature?: number;
}

export interface GenerateReplyResult {
  text: string;
  raw?: unknown;
}

export interface LlmProviderInterface {
  readonly providerName: string;
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
}
