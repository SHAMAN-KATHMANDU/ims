import crypto from "crypto";
import type {
  MessagingProviderInterface,
  ProviderCredentials,
  SendMessagePayload,
  SendMessageResult,
  NormalizedInboundEvent,
} from "./messaging-provider.interface";

export class MessengerProvider implements MessagingProviderInterface {
  readonly providerName = "FACEBOOK_MESSENGER";

  private readonly GRAPH_API_URL = "https://graph.facebook.com/v19.0";

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    appSecret: string,
  ): boolean {
    const expectedSig =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    if (signature.length !== expectedSig.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig),
    );
  }

  parseWebhookPayload(body: any): NormalizedInboundEvent[] {
    const events: NormalizedInboundEvent[] = [];
    if (body.object !== "page") return events;

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      for (const event of entry.messaging || []) {
        const participantId = event.sender?.id;
        const timestamp = event.timestamp;

        if (event.message && !event.message.is_echo) {
          events.push({
            eventType: "message",
            providerEventId: event.message.mid,
            externalId: pageId,
            participantId,
            timestamp,
            message: {
              text: event.message.text,
              contentType: this.mapContentType(event.message),
              mediaUrl: event.message.attachments?.[0]?.payload?.url,
              mediaPayload: event.message.attachments?.[0],
            },
          });
        } else if (event.delivery) {
          events.push({
            eventType: "delivery",
            providerEventId: `delivery_${pageId}_${timestamp}`,
            externalId: pageId,
            participantId,
            timestamp,
            delivery: { providerMessageIds: event.delivery.mids || [] },
          });
        } else if (event.read) {
          events.push({
            eventType: "read",
            providerEventId: `read_${pageId}_${timestamp}`,
            externalId: pageId,
            participantId,
            timestamp,
            read: { watermark: event.read.watermark },
          });
        } else if (event.postback) {
          events.push({
            eventType: "postback",
            providerEventId: `postback_${pageId}_${timestamp}_${participantId}`,
            externalId: pageId,
            participantId,
            timestamp,
            postback: {
              title: event.postback.title,
              payload: event.postback.payload,
            },
          });
        }
      }
    }
    return events;
  }

  async sendMessage(
    credentials: ProviderCredentials,
    payload: SendMessagePayload,
  ): Promise<SendMessageResult> {
    const url = `${this.GRAPH_API_URL}/me/messages?access_token=${credentials.pageAccessToken}`;
    const body: any = {
      recipient: { id: payload.recipientId },
      messaging_type: "RESPONSE",
    };

    if (payload.text) {
      body.message = { text: payload.text };
    } else if (payload.mediaUrl) {
      body.message = {
        attachment: {
          type: payload.mediaType || "image",
          payload: { url: payload.mediaUrl, is_reusable: true },
        },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Messenger API error: ${JSON.stringify(err)}`);
    }

    const result = await response.json();
    return { providerMessageId: result.message_id };
  }

  async getParticipantProfile(
    credentials: ProviderCredentials,
    participantId: string,
  ): Promise<{ name?: string; profilePic?: string }> {
    const url = `${this.GRAPH_API_URL}/${participantId}?fields=first_name,last_name,profile_pic&access_token=${credentials.pageAccessToken}`;
    const response = await fetch(url);
    if (!response.ok) return {};
    const data: any = await response.json();
    return {
      name: [data.first_name, data.last_name].filter(Boolean).join(" "),
      profilePic: data.profile_pic,
    };
  }

  private mapContentType(
    message: any,
  ): NormalizedInboundEvent["message"] extends infer M
    ? M extends { contentType: infer C }
      ? C
      : never
    : never {
    if (message.text) return "TEXT";
    const attachment = message.attachments?.[0];
    if (!attachment) return "TEXT";
    switch (attachment.type) {
      case "image":
        return "IMAGE";
      case "video":
        return "VIDEO";
      case "audio":
        return "AUDIO";
      case "file":
        return "FILE";
      case "location":
        return "LOCATION";
      default:
        return "TEXT";
    }
  }
}
