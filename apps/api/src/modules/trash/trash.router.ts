import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import trashController from "./trash.controller";

const trashRouter = Router();

trashRouter.use(authorizeRoles("admin", "superAdmin"));

trashRouter.get("/", asyncHandler(trashController.listTrash));
trashRouter.post(
  "/:entityType/:id/restore",
  asyncHandler(trashController.restoreItem),
);
trashRouter.delete(
  "/:entityType/:id",
  asyncHandler(trashController.permanentlyDeleteItem),
);

export default trashRouter;
