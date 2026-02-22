import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateParams, validateQuery } from "@/middlewares/validateRequest";
import trashController from "./trash.controller";
import { trashEntityParamsSchema, trashListQuerySchema } from "./trash.schema";

const trashRouter = Router();

trashRouter.use(verifyToken, authorizeRoles("admin", "superAdmin"));

trashRouter.get(
  "/",
  validateQuery(trashListQuerySchema),
  asyncHandler(trashController.listTrash),
);
trashRouter.post(
  "/:entityType/:id/restore",
  validateParams(trashEntityParamsSchema),
  asyncHandler(trashController.restoreItem),
);
trashRouter.delete(
  "/:entityType/:id",
  validateParams(trashEntityParamsSchema),
  asyncHandler(trashController.permanentlyDeleteItem),
);

export default trashRouter;
