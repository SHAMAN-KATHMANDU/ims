import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import taskController from "./task.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./task.schema";

const taskRouter = Router();

taskRouter.use(verifyToken);
taskRouter.use(authorizeRoles("user", "admin", "superAdmin"));

taskRouter.post(
  "/",
  validateBody(createTaskSchema),
  asyncHandler(taskController.create),
);
taskRouter.get(
  "/",
  validateQuery(taskListQuerySchema),
  asyncHandler(taskController.getAll),
);
taskRouter.get(
  "/:id",
  validateParams(taskIdParamsSchema),
  asyncHandler(taskController.getById),
);
taskRouter.put(
  "/:id",
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  asyncHandler(taskController.update),
);
taskRouter.post(
  "/:id/complete",
  validateParams(taskIdParamsSchema),
  asyncHandler(taskController.complete),
);
taskRouter.delete(
  "/:id",
  validateParams(taskIdParamsSchema),
  asyncHandler(taskController.delete),
);

export default taskRouter;
