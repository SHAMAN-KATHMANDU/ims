import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import categoryController from "@/modules/categories/category.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const categoryRouter = Router();

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Home Decor
 *               description:
 *                 type: string
 *                 example: Home decoration items and accessories
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or SuperAdmin role required
 *       409:
 *         description: Category with this name already exists
 */
categoryRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(categoryController.createCategory),
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 count:
 *                   type: number
 */
categoryRouter.get(
  "/",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(categoryController.getAllCategories),
);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
categoryRouter.get(
  "/:id",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(categoryController.getCategoryById),
);

// Get distinct subcategories for a category
categoryRouter.get(
  "/:id/subcategories",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(categoryController.getCategorySubcategories),
);

// Create subcategory for a category
categoryRouter.post(
  "/:id/subcategories",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(categoryController.createSubcategory),
);

// Delete subcategory for a category
categoryRouter.delete(
  "/:id/subcategories",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(categoryController.deleteSubcategory),
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
categoryRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(categoryController.updateCategory),
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with existing products
 *       404:
 *         description: Category not found
 */
categoryRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(categoryController.deleteCategory),
);

export default categoryRouter;
