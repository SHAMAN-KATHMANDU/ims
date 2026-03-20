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
}

export interface SendMessageResult {
  providerMessageId: string;
  timestamp?: string;
}

export interface NormalizedInboundEvent {
  eventType: "message" | "delivery" | "read" | "postback" | "unknown";
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

  getParticipantProfile?(
    credentials: ProviderCredentials,
    participantId: string,
  ): Promise<{ name?: string; profilePic?: string }>;
}
