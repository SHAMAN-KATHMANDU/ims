import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import activityController from "./activity.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const activityRouter = Router();

activityRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /activities:
 *   post:
 *     summary: Create activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, subject]
 *             properties:
 *               type: { type: string }
 *               subject: { type: string }
 *               dealId: { type: string, format: uuid }
 *               contactId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Activity created }
 */
activityRouter.post("/", asyncHandler(activityController.create));

/**
 * @swagger
 * /activities/contact/{contactId}:
 *   get:
 *     summary: Get activities by contact
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Activities list }
 */
activityRouter.get(
  "/contact/:contactId",
  asyncHandler(activityController.getByContact),
);

/**
 * @swagger
 * /activities/deal/{dealId}:
 *   get:
 *     summary: Get activities by deal
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dealId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Activities list }
 */
activityRouter.get("/deal/:dealId", asyncHandler(activityController.getByDeal));

/**
 * @swagger
 * /activities/{id}:
 *   get:
 *     summary: Get activity by ID
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Activity details }
 *       404: { description: Not found }
 */
activityRouter.get("/:id", asyncHandler(activityController.getById));

/**
 * @swagger
 * /activities/{id}:
 *   delete:
 *     summary: Delete activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Activity deleted }
 */
activityRouter.delete("/:id", asyncHandler(activityController.delete));

export default activityRouter;
