import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import leadController from "./lead.controller";

const leadRouter = Router();

leadRouter.use(verifyToken);
leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));

leadRouter.post("/", leadController.create);
leadRouter.get("/", leadController.getAll);
leadRouter.get("/:id", leadController.getById);
leadRouter.put("/:id", leadController.update);
leadRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  leadController.delete,
);
leadRouter.post("/:id/convert", leadController.convert);
leadRouter.post("/:id/assign", leadController.assign);

export default leadRouter;
