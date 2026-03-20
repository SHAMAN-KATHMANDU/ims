import crypto from "crypto";
import fs from "fs";
import path from "path";
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

  /**
   * Sends attachment before text so captions are not lost (single Graph request
   * cannot include both attachment and text in the way we previously built the body).
   * Returns the first provider message id (attachment send when media is present).
   *
   * When `mediaFilePath` is provided (local file), the file is uploaded directly
   * via multipart/form-data so Facebook doesn't need to download from our server.
   * Falls back to URL-based attachment when only `mediaUrl` is provided.
   */
  async sendMessage(
    credentials: ProviderCredentials,
    payload: SendMessagePayload,
  ): Promise<SendMessageResult> {
    const token = credentials.pageAccessToken;
    const recipientId = payload.recipientId;

    let primaryMessageId: string | undefined;

    if (payload.mediaFilePath) {
      const attachmentResult = await this.postGraphMessageWithFile(
        token,
        recipientId,
        payload.mediaFilePath,
        payload.mediaType || "image",
      );
      primaryMessageId = attachmentResult.message_id;
    } else if (payload.mediaUrl) {
      const attachmentResult = await this.postGraphMessage(token, recipientId, {
        attachment: {
          type: payload.mediaType || "image",
          payload: { url: payload.mediaUrl, is_reusable: true },
        },
      });
      primaryMessageId = attachmentResult.message_id;
    }

    if (payload.text?.trim()) {
      const textResult = await this.postGraphMessage(token, recipientId, {
        text: payload.text,
      });
      if (!primaryMessageId) {
        primaryMessageId = textResult.message_id;
      }
    }

    if (!primaryMessageId) {
      throw new Error(
        "Messenger sendMessage requires non-empty text or mediaUrl",
      );
    }

    return { providerMessageId: primaryMessageId };
  }

  private async postGraphMessage(
    pageAccessToken: string,
    recipientId: string,
    message: {
      text: string;
    } | {
      attachment: {
        type: string;
        payload: { url: string; is_reusable: boolean };
      };
    },
  ): Promise<{ message_id: string }> {
    const url = `${this.GRAPH_API_URL}/me/messages?access_token=${pageAccessToken}`;
    const body = {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json()) as unknown;
      throw new Error(`Messenger API error: ${JSON.stringify(err)}`);
    }

    const result = (await response.json()) as { message_id: string };
    return result;
  }

  /**
   * Uploads a local file directly to the Send API using multipart/form-data.
   * This avoids requiring Facebook to download from our server (which fails
   * when the server isn't publicly accessible or behind NAT/firewall).
   */
  private async postGraphMessageWithFile(
    pageAccessToken: string,
    recipientId: string,
    filePath: string,
    mediaType: string,
  ): Promise<{ message_id: string }> {
    const url = `${this.GRAPH_API_URL}/me/messages?access_token=${pageAccessToken}`;

    const fileName = path.basename(filePath);
    const mimeType = this.guessMimeType(fileName);

    const messageJson = JSON.stringify({
      attachment: {
        type: mediaType,
        payload: { is_reusable: true },
      },
    });

    const formData = new FormData();
    formData.append("recipient", JSON.stringify({ id: recipientId }));
    formData.append("messaging_type", "RESPONSE");
    formData.append("message", messageJson);
    const fileBuffer = fs.readFileSync(filePath);
    formData.append(
      "filedata",
      new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
      fileName,
    );

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = (await response.json()) as unknown;
      throw new Error(`Messenger API error: ${JSON.stringify(err)}`);
    }

    const result = (await response.json()) as { message_id: string };
    return result;
  }

  private guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".wav": "audio/wav",
      ".pdf": "application/pdf",
    };
    return mimeMap[ext] || "application/octet-stream";
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
