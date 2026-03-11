import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import dealController from "./deal.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const dealRouter = Router();

dealRouter.use(authorizeRoles("user", "admin", "superAdmin"));
dealRouter.use(enforcePlanFeature("salesPipeline"));

/**
 * @swagger
 * /deals:
 *   post:
 *     summary: Create deal
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, value, pipelineId, stageId]
 *             properties:
 *               title: { type: string }
 *               value: { type: number }
 *               pipelineId: { type: string, format: uuid }
 *               stageId: { type: string, format: uuid }
 *               contactId: { type: string, format: uuid }
 *               leadId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Deal created }
 */
dealRouter.post("/", asyncHandler(dealController.create));

/**
 * @swagger
 * /deals/kanban:
 *   get:
 *     summary: Get deals by pipeline (kanban view)
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pipelineId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deals grouped by stage }
 */
dealRouter.get("/kanban", asyncHandler(dealController.getByPipeline));

/**
 * @swagger
 * /deals:
 *   get:
 *     summary: Get all deals
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: pipelineId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: stageId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deals list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedDealsResponse'
 */
dealRouter.get("/", asyncHandler(dealController.getAll));

/**
 * @swagger
 * /deals/{id}:
 *   get:
 *     summary: Get deal by ID
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deal details }
 *       404: { description: Not found }
 */
dealRouter.get("/:id", asyncHandler(dealController.getById));

/**
 * @swagger
 * /deals/{id}:
 *   put:
 *     summary: Update deal
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               title: { type: string }
 *               value: { type: number }
 *               contactId: { type: string }
 *     responses:
 *       200: { description: Deal updated }
 */
dealRouter.put("/:id", asyncHandler(dealController.update));

/**
 * @swagger
 * /deals/{id}/stage:
 *   patch:
 *     summary: Update deal stage
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             required: [stageId]
 *             properties:
 *               stageId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Stage updated }
 */
dealRouter.patch("/:id/stage", asyncHandler(dealController.updateStage));

dealRouter.post("/:id/line-items", asyncHandler(dealController.addLineItem));
dealRouter.delete(
  "/:id/line-items/:lineItemId",
  asyncHandler(dealController.removeLineItem),
);
dealRouter.post(
  "/:id/convert-to-sale",
  asyncHandler(dealController.convertToSale),
);

/**
 * @swagger
 * /deals/{id}:
 *   delete:
 *     summary: Delete deal
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deal deleted }
 */
dealRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(dealController.delete),
);

export default dealRouter;
