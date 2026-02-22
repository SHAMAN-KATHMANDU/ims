import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import pipelineController from "./pipeline.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validateRequest";
import { createPipelineSchema, updatePipelineSchema } from "./pipeline.schema";

const pipelineRouter = Router();

pipelineRouter.use(verifyToken);
pipelineRouter.use(authorizeRoles("user", "admin", "superAdmin"));

pipelineRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  validateBody(createPipelineSchema),
  asyncHandler(pipelineController.create),
);
pipelineRouter.get("/", asyncHandler(pipelineController.getAll));
pipelineRouter.get("/:id", asyncHandler(pipelineController.getById));
pipelineRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  validateBody(updatePipelineSchema),
  asyncHandler(pipelineController.update),
);
pipelineRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(pipelineController.delete),
);

export default pipelineRouter;
