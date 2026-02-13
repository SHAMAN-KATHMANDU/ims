import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dealController from "./deal.controller";

const dealRouter = Router();

dealRouter.use(verifyToken);
dealRouter.use(authorizeRoles("user", "admin", "superAdmin"));

dealRouter.post("/", dealController.create);
dealRouter.get("/kanban", dealController.getByPipeline);
dealRouter.get("/", dealController.getAll);
dealRouter.get("/:id", dealController.getById);
dealRouter.put("/:id", dealController.update);
dealRouter.patch("/:id/stage", dealController.updateStage);
dealRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  dealController.delete,
);

export default dealRouter;
