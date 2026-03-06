import { Router } from "express";
import { verifyWebhookSignature } from "./webhook.middleware";
import { verify, receive } from "./webhook.controller";

const webhookRouter = Router();

// GET — Meta webhook verification (challenge-response). No signature check.
webhookRouter.get("/:provider", verify);

// POST — Inbound webhook events. Signature verification required.
webhookRouter.post("/:provider", verifyWebhookSignature, receive);

export default webhookRouter;
