import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import taskController from "./task.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const taskRouter = Router();

taskRouter.use(authorizeRoles("user", "admin", "superAdmin"));

taskRouter.post("/", asyncHandler(taskController.create));
taskRouter.get("/", asyncHandler(taskController.getAll));
taskRouter.get("/:id", asyncHandler(taskController.getById));
taskRouter.put("/:id", asyncHandler(taskController.update));
taskRouter.post("/:id/complete", asyncHandler(taskController.complete));
taskRouter.delete("/:id", asyncHandler(taskController.delete));

export default taskRouter;
