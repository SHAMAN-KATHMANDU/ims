import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import leadController from "./lead.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const leadRouter = Router();

leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Create lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               sourceId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Lead created }
 */
leadRouter.post("/", asyncHandler(leadController.create));

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: Get all leads
 *     tags: [Leads]
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
 *     responses:
 *       200:
 *         description: Leads list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLeadsResponse'
 */
leadRouter.get("/", asyncHandler(leadController.getAll));

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lead details }
 *       404: { description: Not found }
 */
leadRouter.get("/:id", asyncHandler(leadController.getById));

/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Leads]
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
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200: { description: Lead updated }
 */
leadRouter.put("/:id", asyncHandler(leadController.update));

/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lead deleted }
 */
leadRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(leadController.delete),
);

/**
 * @swagger
 * /leads/{id}/convert:
 *   post:
 *     summary: Convert lead to contact/deal
 *     tags: [Leads]
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
 *               pipelineId: { type: string, format: uuid }
 *               stageId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lead converted }
 */
leadRouter.post("/:id/convert", asyncHandler(leadController.convert));

/**
 * @swagger
 * /leads/{id}/assign:
 *   post:
 *     summary: Assign lead to user
 *     tags: [Leads]
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lead assigned }
 */
leadRouter.post("/:id/assign", asyncHandler(leadController.assign));

export default leadRouter;
