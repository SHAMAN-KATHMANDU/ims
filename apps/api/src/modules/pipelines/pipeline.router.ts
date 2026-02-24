import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import pipelineController from "./pipeline.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const pipelineRouter = Router();

pipelineRouter.use(authorizeRoles("user", "admin", "superAdmin"));

pipelineRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.create),
);
pipelineRouter.get("/", asyncHandler(pipelineController.getAll));
pipelineRouter.get("/:id", asyncHandler(pipelineController.getById));
pipelineRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.update),
);
pipelineRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.delete),
);

export default pipelineRouter;
