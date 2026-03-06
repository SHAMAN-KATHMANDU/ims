import crypto from "crypto";
import { createError } from "@/middlewares/errorHandler";
import { env } from "@/config/env";
import { encrypt } from "@/utils/encryption";
import messagingChannelRepository from "./messaging-channel.repository";
import type {
  ConnectChannelDto,
  UpdateChannelDto,
} from "./messaging-channel.schema";

const GRAPH_API = "https://graph.facebook.com/v19.0";

export class MessagingChannelService {
  async getAll(tenantId: string) {
    return messagingChannelRepository.findAll(tenantId);
  }

  async getById(tenantId: string, id: string) {
    const channel = await messagingChannelRepository.findById(tenantId, id);
    if (!channel) throw createError("Channel not found", 404);
    return channel;
  }

  async connect(tenantId: string, dto: ConnectChannelDto) {
    // 1. Exchange auth code for short-lived user access token
    const tokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          redirect_uri: dto.redirectUri,
          code: dto.authCode,
        }),
    );
    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      throw createError(
        `Facebook OAuth error: ${err.error?.message || "Unknown error"}`,
        400,
      );
    }
    const { access_token: shortToken } = (await tokenRes.json()) as any;

    // 2. Exchange for long-lived token
    const longTokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.metaAppId,
          client_secret: env.metaAppSecret,
          fb_exchange_token: shortToken,
        }),
    );
    if (!longTokenRes.ok) {
      throw createError("Failed to get long-lived token", 400);
    }
    const { access_token: longToken } = (await longTokenRes.json()) as any;

    // 3. Get pages the user manages
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?access_token=${longToken}`,
    );
    if (!pagesRes.ok) {
      throw createError("Failed to fetch Facebook pages", 400);
    }
    const pagesData = (await pagesRes.json()) as any;
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      throw createError(
        "No Facebook pages found. Ensure the user has admin access to at least one page.",
        400,
      );
    }

    // Use the first page (frontend can allow selection in the future)
    const page = pages[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;
    const pageName = page.name;

    // 4. Check if this page is already connected
    const existing = await messagingChannelRepository.findByExternalId(
      "FACEBOOK_MESSENGER",
      pageId,
    );
    if (existing) {
      throw createError(
        "This Facebook page is already connected to a channel",
        409,
      );
    }

    // 5. Subscribe the page to webhook events
    const subscribeRes = await fetch(
      `${GRAPH_API}/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads&access_token=${pageAccessToken}`,
      { method: "POST" },
    );
    if (!subscribeRes.ok) {
      const err = await subscribeRes.json();
      throw createError(
        `Failed to subscribe page to webhooks: ${err.error?.message || "Unknown"}`,
        400,
      );
    }

    // 6. Generate verify token, encrypt credentials, create channel
    const webhookVerifyToken = crypto.randomBytes(32).toString("hex");
    const credentialsEnc = encrypt(JSON.stringify({ pageAccessToken }));

    return messagingChannelRepository.create({
      tenantId,
      provider: "FACEBOOK_MESSENGER",
      name: pageName,
      externalId: pageId,
      credentialsEnc,
      webhookVerifyToken,
      metadata: {
        pageName: page.name,
        pageCategory: page.category,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateChannelDto) {
    const channel = await messagingChannelRepository.findById(tenantId, id);
    if (!channel) throw createError("Channel not found", 404);

    return messagingChannelRepository.update(id, {
      ...(dto.name && { name: dto.name }),
    });
  }

  async disconnect(tenantId: string, id: string) {
    const channel = await messagingChannelRepository.findById(tenantId, id);
    if (!channel) throw createError("Channel not found", 404);

    return messagingChannelRepository.disconnect(id);
  }
}

export default new MessagingChannelService();
