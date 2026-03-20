export interface ProviderCredentials {
  [key: string]: string;
}

export interface SendMessagePayload {
  recipientId: string;
  text?: string;
  mediaUrl?: string;
  /** Absolute path to a local file — used for direct multipart upload to the provider. */
  mediaFilePath?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  /** Parent message `mid` for Meta Send API `reply_to` (threaded reply). */
  replyToProviderMessageId?: string;
}

export interface SendMessageResult {
  providerMessageId: string;
  timestamp?: string;
}

export interface NormalizedInboundEvent {
  eventType:
    | "message"
    | "delivery"
    | "read"
    | "postback"
    | "reaction"
    | "unknown";
  providerEventId: string;
  externalId: string;
  participantId: string;
  participantName?: string;
  timestamp: number;

  message?: {
    text?: string;
    contentType:
      | "TEXT"
      | "IMAGE"
      | "VIDEO"
      | "AUDIO"
      | "FILE"
      | "LOCATION"
      | "STICKER";
    mediaUrl?: string;
    mediaPayload?: unknown;
    /** Messenger `reply_to.mid` when the user replies to a specific message. */
    replyToProviderMessageId?: string;
  };

  delivery?: {
    providerMessageIds: string[];
  };

  read?: {
    watermark: number;
  };

  postback?: {
    title: string;
    payload: string;
  };

  /** Messenger `message_reactions` webhook (participant reacting to a message). */
  reaction?: {
    targetProviderMessageId: string;
    emoji: string;
    action: "react" | "unreact";
  };
}

export interface MessagingProviderInterface {
  readonly providerName: string;

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    appSecret: string,
  ): boolean;

  parseWebhookPayload(body: unknown): NormalizedInboundEvent[];

  sendMessage(
    credentials: ProviderCredentials,
    payload: SendMessagePayload,
  ): Promise<SendMessageResult>;

  /** Meta Send API `sender_action: react` — optional per provider. */
  reactToMessage?(
    credentials: ProviderCredentials,
    recipientPsid: string,
    targetProviderMessageId: string,
    emoji: string,
  ): Promise<void>;

  /** Meta Send API `sender_action: unreact`. */
  unreactToMessage?(
    credentials: ProviderCredentials,
    recipientPsid: string,
    targetProviderMessageId: string,
  ): Promise<void>;

  getParticipantProfile?(
    credentials: ProviderCredentials,
    participantId: string,
  ): Promise<{ name?: string; profilePic?: string }>;
}
