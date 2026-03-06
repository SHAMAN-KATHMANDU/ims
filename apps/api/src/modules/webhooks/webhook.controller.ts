import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import { inboundQueue, statusQueue } from "@/queues/queue.config";
import { getProvider } from "@/providers/provider-factory";
import { logger } from "@/config/logger";
import { MessagingProvider } from "@prisma/client";

const PROVIDER_MAP: Record<string, MessagingProvider> = {
  messenger: "FACEBOOK_MESSENGER",
};

export async function verify(req: Request, res: Response) {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && token) {
    const channel = await basePrisma.messagingChannel.findFirst({
      where: { webhookVerifyToken: token },
    });

    if (channel) {
      logger.log(`[Webhook] Verification successful for channel ${channel.id}`);
      res.status(200).send(challenge);
      return;
    }
  }

  logger.warn("[Webhook] Verification failed");
  res.status(403).json({ message: "Verification failed" });
}

export async function receive(req: Request, res: Response) {
  // Respond 200 immediately — Meta retries on non-200
  res.status(200).json({ status: "ok" });

  const providerEnum = PROVIDER_MAP[req.params.provider];
  if (!providerEnum) return;

  const provider = getProvider(providerEnum);
  const events = provider.parseWebhookPayload(req.body);

  let inboundCount = 0;
  let statusCount = 0;

  for (const event of events) {
    if (event.eventType === "message" || event.eventType === "postback") {
      await inboundQueue.add("inbound", {
        provider: providerEnum,
        event,
      });
      inboundCount++;
    } else if (event.eventType === "delivery" || event.eventType === "read") {
      await statusQueue.add("status", {
        provider: providerEnum,
        event,
      });
      statusCount++;
    }
  }

  logger.log(
    `[Webhook] Enqueued ${inboundCount} inbound, ${statusCount} status events`,
  );
}
