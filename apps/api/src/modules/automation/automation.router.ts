import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import automationController from "./automation.controller";

const automationRouter = Router();

automationRouter.use(authorizeRoles("admin", "superAdmin"));
automationRouter.use(enforceEnvFeature(EnvFeature.AUTOMATION));

/**
 * @swagger
 * /automation/definitions:
 *   get:
 *     summary: List automation definitions
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Automation definitions
 */
automationRouter.get(
  "/definitions",
  asyncHandler(automationController.getDefinitions),
);

/**
 * @swagger
 * /automation/definitions/{id}:
 *   get:
 *     summary: Get automation definition
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Automation definition
 */
automationRouter.get(
  "/definitions/:id",
  asyncHandler(automationController.getDefinitionById),
);

/**
 * @swagger
 * /automation/definitions:
 *   post:
 *     summary: Create automation definition
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Automation created
 */
automationRouter.post(
  "/definitions",
  asyncHandler(automationController.createDefinition),
);

/**
 * @swagger
 * /automation/definitions/{id}:
 *   put:
 *     summary: Update automation definition
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Automation updated
 */
automationRouter.put(
  "/definitions/:id",
  asyncHandler(automationController.updateDefinition),
);

/**
 * @swagger
 * /automation/definitions/{id}:
 *   delete:
 *     summary: Archive automation definition
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Automation archived
 */
automationRouter.delete(
  "/definitions/:id",
  asyncHandler(automationController.archiveDefinition),
);

/**
 * @swagger
 * /automation/definitions/{id}/runs:
 *   get:
 *     summary: List automation runs
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Automation runs
 */
automationRouter.get(
  "/definitions/:id/runs",
  asyncHandler(automationController.getRuns),
);

/**
 * @swagger
 * /automation/events/{id}/replay:
 *   post:
 *     summary: Replay or resume a failed automation event
 *     description: |
 *       When `reprocessFromStart` is false, the API first tries to resume failed LIVE runs
 *       for that event from the first failed step. If none are resumable, it falls back to
 *       queuing a full replay (same as `reprocessFromStart` true).
 *     tags: [Automation]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reprocessFromStart:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       202:
 *         description: Replay queued or runs resumed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     replayQueued: { type: boolean }
 *                     resumedRuns: { type: integer }
 *                     mode: { type: string, enum: [full, resume] }
 */
automationRouter.post(
  "/events/:id/replay",
  asyncHandler(automationController.replayEvent),
);

export default automationRouter;
