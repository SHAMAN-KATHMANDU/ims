import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import workflowController from "./workflow.controller";

const workflowRouter = Router();

workflowRouter.use(authorizeRoles("admin", "superAdmin"));
workflowRouter.use(enforceEnvFeature(EnvFeature.CRM_WORKFLOWS));
workflowRouter.use(enforcePlanFeature("salesPipeline"));

/**
 * @swagger
 * /workflows/templates:
 *   get:
 *     summary: List workflow templates
 *     description: Returns the ready-made workflow catalog with tenant install state and available pipelines.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Workflow template catalog
 */
workflowRouter.get("/templates", asyncHandler(workflowController.getTemplates));

/**
 * @swagger
 * /workflows/templates/{templateKey}/install:
 *   post:
 *     summary: Install or reinstall a workflow template
 *     description: Installs a ready-made workflow template onto a compatible tenant pipeline. Returns whether the template was newly installed, reused, or overwritten.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: templateKey
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pipelineId: { type: string, format: uuid }
 *               overwriteExisting: { type: boolean }
 *               activate: { type: boolean }
 *     responses:
 *       201:
 *         description: Workflow template installed for the first time
 *       200:
 *         description: Existing template reused or overwritten
 *       400:
 *         description: Invalid pipeline or stage mapping for the selected template
 *       404:
 *         description: Unknown workflow template
 */
workflowRouter.post(
  "/templates/:templateKey/install",
  asyncHandler(workflowController.installTemplate),
);

/**
 * @swagger
 * /workflows:
 *   get:
 *     summary: List workflows
 *     description: Returns all workflows for the tenant, optionally filtered by pipeline.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: pipelineId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter workflows by pipeline ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number (when not filtering by pipelineId)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page (when not filtering by pipelineId)
 *     responses:
 *       200:
 *         description: List of workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 workflows:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Workflow' }
 *       400:
 *         description: Validation error (e.g. invalid pipelineId)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
workflowRouter.get("/", asyncHandler(workflowController.getAll));

/**
 * @swagger
 * /workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     description: Returns a single workflow with rules and pipeline.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Workflow details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 workflow: { $ref: '#/components/schemas/Workflow' }
 *       400:
 *         description: Invalid workflow ID
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
workflowRouter.get("/:id", asyncHandler(workflowController.getById));

/**
 * @swagger
 * /workflows/{id}/runs:
 *   get:
 *     summary: List recent workflow runs
 *     description: Returns recent execution history for a workflow.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Recent workflow runs
 *       404:
 *         description: Workflow not found
 *       400:
 *         description: Validation error
 */
workflowRouter.get("/:id/runs", asyncHandler(workflowController.getRuns));

/**
 * @swagger
 * /workflows:
 *   post:
 *     summary: Create workflow
 *     description: Creates a new pipeline workflow with optional rules.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateWorkflowInput' }
 *     responses:
 *       201:
 *         description: Workflow created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 workflow: { $ref: '#/components/schemas/Workflow' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
workflowRouter.post("/", asyncHandler(workflowController.create));

/**
 * @swagger
 * /workflows/{id}:
 *   put:
 *     summary: Update workflow
 *     description: Updates workflow name, active state, and/or rules.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateWorkflowInput' }
 *     responses:
 *       200:
 *         description: Workflow updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 workflow: { $ref: '#/components/schemas/Workflow' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
workflowRouter.put("/:id", asyncHandler(workflowController.update));

/**
 * @swagger
 * /workflows/{id}:
 *   delete:
 *     summary: Delete workflow
 *     description: Permanently deletes a workflow and its rules.
 *     tags: [Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Workflow deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Invalid workflow ID
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
workflowRouter.delete("/:id", asyncHandler(workflowController.delete));

export default workflowRouter;
