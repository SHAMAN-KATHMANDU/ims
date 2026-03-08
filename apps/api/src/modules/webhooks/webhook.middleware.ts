import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { getProvider } from "@/providers/provider-factory";
import { logger } from "@/config/logger";
import { MessagingProvider } from "@prisma/client";

const PROVIDER_MAP: Record<string, MessagingProvider> = {
  messenger: "FACEBOOK_MESSENGER",
  FACEBOOK_MESSENGER: "FACEBOOK_MESSENGER",
};

export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature) {
    logger.warn("[Webhook] Missing X-Hub-Signature-256 header");
    res.status(401).json({ message: "Missing signature" });
    return;
  }

  const providerEnum = PROVIDER_MAP[req.params.provider];
  if (!providerEnum) {
    res.status(400).json({ message: "Unknown provider" });
    return;
  }

  const provider = getProvider(providerEnum);
  const rawBody = req.body as Buffer;

  const isValid = provider.verifyWebhookSignature(
    rawBody,
    signature,
    env.metaAppSecret,
  );

  if (!isValid) {
    logger.warn(`[Webhook] Invalid signature for ${req.params.provider}`);
    res.status(401).json({ message: "Invalid signature" });
    return;
  }

  try {
    req.body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  next();
}
