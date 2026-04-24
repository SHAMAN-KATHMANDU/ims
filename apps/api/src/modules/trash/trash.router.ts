import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { asyncHandler } from "@/middlewares/errorHandler";
import trashController from "./trash.controller";

const trashRouter = Router();

trashRouter.use(requirePermission("SETTINGS.TRASH.VIEW", workspaceLocator()));

/**
 * @swagger
 * /platform/trash:
 *   get:
 *     summary: List soft-deleted items
 *     tags: [Trash]
 *     security:
 *       - bearerAuth: []
 */
trashRouter.get("/", asyncHandler(trashController.listTrash));

/**
 * @swagger
 * /platform/trash/{entityType}/{id}/restore:
 *   post:
 *     summary: Restore soft-deleted item
 *     tags: [Trash]
 *     security:
 *       - bearerAuth: []
 */
trashRouter.post(
  "/:entityType/:id/restore",
  requirePermission("SETTINGS.TRASH.RESTORE", paramLocator("TRASH_ITEM", "id")),
  asyncHandler(trashController.restoreItem),
);

/**
 * @swagger
 * /platform/trash/{entityType}/{id}:
 *   delete:
 *     summary: Permanently delete item from trash (dangerous)
 *     tags: [Trash]
 *     security:
 *       - bearerAuth: []
 */
trashRouter.delete(
  "/:entityType/:id",
  requirePermission("SETTINGS.TRASH.PURGE", paramLocator("TRASH_ITEM", "id")),
  asyncHandler(trashController.permanentlyDeleteItem),
);

export default trashRouter;
