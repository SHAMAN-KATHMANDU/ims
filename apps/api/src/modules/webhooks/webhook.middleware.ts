import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { getProvider } from "@/providers/provider-factory";
import { logger } from "@/config/logger";
import { MessagingProvider } from "@prisma/client";
import { resolveAppSecretForPage } from "@/modules/meta-integration/meta-integration.service";

const PROVIDER_MAP: Record<string, MessagingProvider> = {
  messenger: "FACEBOOK_MESSENGER",
  FACEBOOK_MESSENGER: "FACEBOOK_MESSENGER",
};

/** Peek the page id from a raw page-webhook body without trusting it yet. */
function extractPageId(rawBody: Buffer): string | undefined {
  try {
    const parsed = JSON.parse(rawBody.toString("utf8")) as {
      object?: string;
      entry?: Array<{ id?: string }>;
    };
    if (parsed.object !== "page") return undefined;
    const id = parsed.entry?.[0]?.id;
    return id == null ? undefined : String(id);
  } catch {
    return undefined;
  }
}

export async function verifyWebhookSignature(
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

  // Bring-your-own-app: each tenant signs with their own app secret, resolved
  // from the page id. Fall back to the platform secret for legacy channels.
  let appSecret = env.metaAppSecret;
  const pageId = extractPageId(rawBody);
  if (pageId) {
    try {
      const tenantSecret = await resolveAppSecretForPage(pageId);
      if (tenantSecret) appSecret = tenantSecret;
    } catch (err) {
      logger.warn(
        "[Webhook] app-secret resolution failed; using platform secret",
        undefined,
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }
  }

  const isValid = provider.verifyWebhookSignature(
    rawBody,
    signature,
    appSecret,
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
