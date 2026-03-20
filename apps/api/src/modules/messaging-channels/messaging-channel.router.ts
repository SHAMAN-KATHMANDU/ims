import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { requireDevelopment } from "@/middlewares/requireDevelopment";
import messagingChannelController from "./messaging-channel.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const messagingChannelRouter = Router();

messagingChannelRouter.use(enforceEnvFeature(EnvFeature.MESSAGING));
messagingChannelRouter.use(enforcePlanFeature("messaging"));
messagingChannelRouter.use(authorizeRoles("admin", "superAdmin"));

messagingChannelRouter.get(
  "/",
  asyncHandler(messagingChannelController.getAll),
);

/**
 * @swagger
 * /messaging-channels/manual-connect/webhook-verify:
 *   post:
 *     operationId: registerManualWebhookVerify
 *     summary: "Manual connect step 1 — save webhook verify token (development only)"
 *     description: >
 *       Persists the verify token so Meta GET webhook verification can succeed before any page token is stored.
 *       After Meta shows verification success, call POST .../manual-connect/{channelId}/complete with page credentials.
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, webhookVerifyToken]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [FACEBOOK_MESSENGER]
 *               webhookVerifyToken:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       201:
 *         description: Pending channel created (status PENDING)
 *       400:
 *         description: Validation error
 *       409:
 *         description: Verify token already in use
 *
 * /messaging-channels/manual-connect/{channelId}/complete:
 *   post:
 *     operationId: completeManualConnectMessagingChannel
 *     summary: "Manual connect step 2 — page token and subscription (development only)"
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pageId, pageAccessToken, pageName]
 *             properties:
 *               pageId:
 *                 type: string
 *               pageAccessToken:
 *                 type: string
 *               pageName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Channel active
 *       400:
 *         description: Validation or wrong channel state
 *       404:
 *         description: Channel not found
 *       409:
 *         description: Page already connected elsewhere
 */
messagingChannelRouter.post(
  "/manual-connect/webhook-verify",
  requireDevelopment,
  asyncHandler(messagingChannelController.registerManualWebhookVerify),
);

messagingChannelRouter.post(
  "/manual-connect/:channelId/complete",
  requireDevelopment,
  asyncHandler(messagingChannelController.completeManualConnect),
);

messagingChannelRouter.get(
  "/:id",
  asyncHandler(messagingChannelController.getById),
);

messagingChannelRouter.post(
  "/",
  asyncHandler(messagingChannelController.connect),
);

messagingChannelRouter.put(
  "/:id",
  asyncHandler(messagingChannelController.update),
);

messagingChannelRouter.delete(
  "/:id",
  asyncHandler(messagingChannelController.disconnect),
);

export default messagingChannelRouter;
