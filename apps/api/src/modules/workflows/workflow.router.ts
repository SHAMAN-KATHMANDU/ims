import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import workflowController from "./workflow.controller";

const workflowRouter = Router();

workflowRouter.use(authorizeRoles("admin", "superAdmin"));

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
