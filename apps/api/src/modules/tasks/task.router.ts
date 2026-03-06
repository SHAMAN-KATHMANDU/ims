import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import taskController from "./task.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const taskRouter = Router();

taskRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               dealId: { type: string, format: uuid }
 *               dueDate: { type: string, format: date-time }
 *               isCompleted: { type: boolean }
 *     responses:
 *       201: { description: Task created }
 */
taskRouter.post("/", asyncHandler(taskController.create));

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dealId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: isCompleted
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Tasks list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTasksResponse'
 */
taskRouter.get("/", asyncHandler(taskController.getAll));

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task details }
 *       404: { description: Not found }
 */
taskRouter.get("/:id", asyncHandler(taskController.getById));

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               dueDate: { type: string }
 *               isCompleted: { type: boolean }
 *     responses:
 *       200: { description: Task updated }
 */
taskRouter.put("/:id", asyncHandler(taskController.update));

/**
 * @swagger
 * /tasks/{id}/complete:
 *   post:
 *     summary: Mark task complete
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task completed }
 */
taskRouter.post("/:id/complete", asyncHandler(taskController.complete));

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task deleted }
 */
taskRouter.delete("/:id", asyncHandler(taskController.delete));

export default taskRouter;
