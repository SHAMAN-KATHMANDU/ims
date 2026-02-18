import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dealController from "./deal.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const dealRouter = Router();

dealRouter.use(verifyToken);
dealRouter.use(authorizeRoles("user", "admin", "superAdmin"));

dealRouter.post("/", asyncHandler(dealController.create));
dealRouter.get("/kanban", asyncHandler(dealController.getByPipeline));
dealRouter.get("/", asyncHandler(dealController.getAll));
dealRouter.get("/:id", asyncHandler(dealController.getById));
dealRouter.put("/:id", asyncHandler(dealController.update));
dealRouter.patch("/:id/stage", asyncHandler(dealController.updateStage));
dealRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(dealController.delete),
);

export default dealRouter;
