import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import pipelineController from "./pipeline.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const pipelineRouter = Router();

pipelineRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /pipelines:
 *   post:
 *     summary: Create pipeline
 *     tags: [Pipelines]
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
 *               stages: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Pipeline created }
 */
pipelineRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.create),
);

/**
 * @swagger
 * /pipelines:
 *   get:
 *     summary: Get all pipelines
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Pipelines list }
 */
pipelineRouter.get("/", asyncHandler(pipelineController.getAll));

/**
 * @swagger
 * /pipelines/{id}:
 *   get:
 *     summary: Get pipeline by ID
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pipeline details }
 *       404: { description: Not found }
 */
pipelineRouter.get("/:id", asyncHandler(pipelineController.getById));

/**
 * @swagger
 * /pipelines/{id}:
 *   put:
 *     summary: Update pipeline
 *     tags: [Pipelines]
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
 *               stages: { type: array }
 *     responses:
 *       200: { description: Pipeline updated }
 */
pipelineRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.update),
);

/**
 * @swagger
 * /pipelines/{id}:
 *   delete:
 *     summary: Delete pipeline
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pipeline deleted }
 */
pipelineRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.delete),
);

export default pipelineRouter;
