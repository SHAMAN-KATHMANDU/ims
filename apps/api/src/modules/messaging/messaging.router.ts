import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { uploadMessagingMedia } from "@/config/multer.config";
import { messagingUploadRateLimit } from "@/middlewares/messagingUploadRateLimit";
import messagingController from "./messaging.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const messagingRouter = Router();

messagingRouter.use(enforceEnvFeature(EnvFeature.MESSAGING));
messagingRouter.use(enforcePlanFeature("messaging"));
messagingRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /messaging/conversations:
 *   get:
 *     summary: List conversations (inbox)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, CLOSED, ARCHIVED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
messagingRouter.get(
  "/conversations",
  asyncHandler(messagingController.getConversations),
);

/**
 * @swagger
 * /messaging/conversations/{id}:
 *   get:
 *     summary: Get one conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
messagingRouter.get(
  "/conversations/:id",
  asyncHandler(messagingController.getConversation),
);

/**
 * @swagger
 * /messaging/conversations/{id}:
 *   put:
 *     summary: Update conversation (assign, status, contact)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedToId: { type: string, format: uuid, nullable: true }
 *               contactId: { type: string, format: uuid, nullable: true }
 *               status: { type: string, enum: [OPEN, CLOSED, ARCHIVED] }
 *     responses:
 *       200: { description: Updated }
 */
messagingRouter.put(
  "/conversations/:id",
  asyncHandler(messagingController.updateConversation),
);

/**
 * @swagger
 * /messaging/conversations/{id}/messages:
 *   get:
 *     summary: List messages (cursor pagination)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: cursor
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: OK }
 */
messagingRouter.get(
  "/conversations/:id/messages",
  asyncHandler(messagingController.getMessages),
);

/**
 * @swagger
 * /messaging/conversations/{id}/messages/{messageId}/reactions:
 *   post:
 *     summary: Add an emoji reaction to a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emoji]
 *             properties:
 *               emoji: { type: string, maxLength: 32 }
 *     responses:
 *       201: { description: Reaction added }
 *       400: { description: Validation error }
 *       404: { description: Message not found }
 */
messagingRouter.post(
  "/conversations/:id/messages/:messageId/reactions",
  asyncHandler(messagingController.addReaction),
);

/**
 * @swagger
 * /messaging/conversations/{id}/messages/{messageId}/reactions/{emoji}:
 *   delete:
 *     summary: Remove current user's reaction (emoji URL-encoded)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: emoji
 *         required: true
 *         schema: { type: string }
 *         description: Percent-encoded emoji (e.g. %F0%9F%91%8D)
 *     responses:
 *       200: { description: Removed }
 *       404: { description: Reaction or message not found }
 */
messagingRouter.delete(
  "/conversations/:id/messages/:messageId/reactions/:emoji",
  asyncHandler(messagingController.removeReaction),
);

/**
 * @swagger
 * /messaging/conversations/{id}/messages/{messageId}:
 *   put:
 *     summary: Edit outbound message text (inbox only; not synced to provider)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Validation error }
 *       403: { description: Not allowed }
 *       404: { description: Not found }
 */
messagingRouter.put(
  "/conversations/:id/messages/:messageId",
  asyncHandler(messagingController.editMessage),
);

/**
 * @swagger
 * /messaging/conversations/{id}/messages:
 *   post:
 *     summary: Send a message (queued for provider delivery)
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one of text or mediaUrl is required
 *             properties:
 *               text:
 *                 type: string
 *                 description: Message body (no max length; control characters stripped server-side)
 *               mediaUrl:
 *                 type: string
 *                 description: Public HTTPS URL or /uploads/messaging/... path from upload endpoint
 *               mediaType:
 *                 type: string
 *                 enum: [image, video, audio, file]
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional message id in the same conversation to reply to
 *     responses:
 *       201: { description: Message queued }
 *       400: { description: Validation error }
 */
messagingRouter.post(
  "/conversations/:id/messages",
  asyncHandler(messagingController.sendMessage),
);

/**
 * @swagger
 * /messaging/conversations/{id}/upload:
 *   post:
 *     summary: Upload image or video for a conversation (multipart)
 *     description: Returns absolute url for use in POST .../messages as mediaUrl. Rate limited (10/min).
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Upload complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 url: { type: string, description: Absolute URL for Messenger / clients }
 *                 mediaType: { type: string, enum: [image, video] }
 *                 relativeUrl: { type: string }
 *       400: { description: Invalid file or missing file }
 *       429: { description: Too many uploads }
 */
messagingRouter.post(
  "/conversations/:id/upload",
  messagingUploadRateLimit,
  (req, res, next) => {
    uploadMessagingMedia(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        return res.status(400).json({ message: msg });
      }
      next();
    });
  },
  asyncHandler(messagingController.uploadMedia),
);

/**
 * @swagger
 * /messaging/conversations/{id}/mark-read:
 *   post:
 *     summary: Mark conversation as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
messagingRouter.post(
  "/conversations/:id/mark-read",
  asyncHandler(messagingController.markRead),
);

export default messagingRouter;
