import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import trashController from "./trash.controller";

const trashRouter = Router();

trashRouter.use(authorizeRoles("admin", "superAdmin"));

/**
 * @swagger
 * /trash:
 *   get:
 *     summary: List soft-deleted items
 *     tags: [Trash]
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
 *         name: entityType
 *         schema: { type: string }
 *         description: "Filter by entity type. Valid values: Product, Category, SubCategory, Vendor, Member, Location, PromoCode, Company, Contact, Lead, Deal, Task, Activity, Pipeline"
 *     responses:
 *       200:
 *         description: Trash items list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTrashResponse'
 */
trashRouter.get("/", asyncHandler(trashController.listTrash));

/**
 * @swagger
 * /trash/{entityType}/{id}/restore:
 *   post:
 *     summary: Restore soft-deleted item
 *     tags: [Trash]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item restored }
 *       404: { description: Not found }
 */
trashRouter.post(
  "/:entityType/:id/restore",
  asyncHandler(trashController.restoreItem),
);

/**
 * @swagger
 * /trash/{entityType}/{id}:
 *   delete:
 *     summary: Permanently delete item from trash
 *     tags: [Trash]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item permanently deleted }
 *       404: { description: Not found }
 */
trashRouter.delete(
  "/:entityType/:id",
  asyncHandler(trashController.permanentlyDeleteItem),
);

export default trashRouter;
