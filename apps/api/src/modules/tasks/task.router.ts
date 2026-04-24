import { Router, Request } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import taskController from "./task.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const taskRouter = Router();

taskRouter.use(authorizeRoles("user", "admin", "superAdmin"));
taskRouter.use(enforcePlanFeature("salesPipeline"));

const workspaceLocator = (): string => "WORKSPACE";
const idLocator = (req: Request): string => req.params.id;

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Task created }
 */
taskRouter.post(
  "/",
  requirePermission("CRM.TASKS.CREATE", workspaceLocator),
  asyncHandler(taskController.create),
);

taskRouter.post(
  "/bulk-complete",
  requirePermission("CRM.TASKS.UPDATE", workspaceLocator),
  asyncHandler(taskController.bulkComplete),
);
taskRouter.post(
  "/bulk-delete",
  requirePermission("CRM.TASKS.DELETE", workspaceLocator),
  asyncHandler(taskController.bulkDelete),
);
taskRouter.delete(
  "/bulk",
  requirePermission("CRM.TASKS.DELETE", workspaceLocator),
  asyncHandler(taskController.bulkDelete),
);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Tasks list }
 */
taskRouter.get(
  "/",
  requirePermission("CRM.TASKS.VIEW", workspaceLocator),
  asyncHandler(taskController.getAll),
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Task details }
 *       404: { description: Not found }
 */
taskRouter.get(
  "/:id",
  requirePermission("CRM.TASKS.VIEW", idLocator),
  asyncHandler(taskController.getById),
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Task updated }
 */
taskRouter.put(
  "/:id",
  requirePermission("CRM.TASKS.UPDATE", idLocator),
  asyncHandler(taskController.update),
);

/**
 * @swagger
 * /tasks/{id}/complete:
 *   post:
 *     summary: Mark task complete
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Task completed }
 */
taskRouter.post(
  "/:id/complete",
  requirePermission("CRM.TASKS.UPDATE", idLocator),
  asyncHandler(taskController.complete),
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Task deleted }
 */
taskRouter.delete(
  "/:id",
  requirePermission("CRM.TASKS.DELETE", idLocator),
  asyncHandler(taskController.delete),
);

export default taskRouter;
