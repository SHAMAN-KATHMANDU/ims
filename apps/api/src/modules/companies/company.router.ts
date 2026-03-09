import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import companyController from "./company.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const companyRouter = Router();

companyRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /companies/list:
 *   get:
 *     summary: List companies for select dropdown
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Companies list }
 */
companyRouter.get("/list", asyncHandler(companyController.listForSelect));

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Company created }
 */
companyRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.create),
);

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Companies list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedCompaniesResponse'
 */
companyRouter.get("/", asyncHandler(companyController.getAll));

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Company details }
 *       404: { description: Not found }
 */
companyRouter.get("/:id", asyncHandler(companyController.getById));

/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     summary: Update company
 *     tags: [Companies]
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
 *               name: { type: string }
 *     responses:
 *       200: { description: Company updated }
 */
companyRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.update),
);

/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     summary: Delete company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Company deleted }
 *       404: { description: Not found }
 */
companyRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.delete),
);

export default companyRouter;
