import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import taskController from "./task.controller";

const taskRouter = Router();

taskRouter.use(verifyToken);
taskRouter.use(authorizeRoles("user", "admin", "superAdmin"));

taskRouter.post("/", taskController.create);
taskRouter.get("/", taskController.getAll);
taskRouter.get("/:id", taskController.getById);
taskRouter.put("/:id", taskController.update);
taskRouter.post("/:id/complete", taskController.complete);
taskRouter.delete("/:id", taskController.delete);

export default taskRouter;
