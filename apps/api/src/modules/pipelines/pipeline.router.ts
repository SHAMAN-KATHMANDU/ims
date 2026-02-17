import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import pipelineController from "./pipeline.controller";

const pipelineRouter = Router();

pipelineRouter.use(verifyToken);
pipelineRouter.use(authorizeRoles("user", "admin", "superAdmin"));

pipelineRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  pipelineController.create,
);
pipelineRouter.get("/", pipelineController.getAll);
pipelineRouter.get("/:id", pipelineController.getById);
pipelineRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  pipelineController.update,
);
pipelineRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  pipelineController.delete,
);

export default pipelineRouter;
