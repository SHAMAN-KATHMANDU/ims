import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanLimits } from "@/middlewares/planLimitMiddleware";
import productController from "@/modules/products/product.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const productRouter = Router();

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imsCode
 *               - name
 *               - categoryId
 *               - costPrice
 *               - mrp
 *             properties:
 *               imsCode:
 *                 type: string
 *                 example: IMS-PHONE-001
 *               name:
 *                 type: string
 *                 example: Smartphone XYZ Pro
 *               categoryId:
 *                 type: string
 *                 example: Electronics
 *                 description: Can be UUID or category name
 *               categoryName:
 *                 type: string
 *                 example: Electronics
 *                 description: Alternative to categoryId
 *               description:
 *                 type: string
 *               length:
 *                 type: number
 *               breadth:
 *                 type: number
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               mrp:
 *                 type: number
 *               variations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     color:
 *                       type: string
 *                     stockQuantity:
 *                       type: number
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           photoUrl:
 *                             type: string
 *                           isPrimary:
 *                             type: boolean
 *               discounts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     discountTypeName:
 *                       type: string
 *                       example: Normal
 *                     discountPercentage:
 *                       type: number
 *                     isActive:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request or validation error
 *       404:
 *         description: Category or discount type not found
 */
productRouter.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  enforcePlanLimits("products"),
  asyncHandler(productController.createProduct),
);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [dateCreated, dateModified, name, imsCode, costPrice, mrp, vendorId, id]
 *         description: Sort field. dateCreated = date added. Use vendorName for vendor name (relation sort).
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (ascending or descending).
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 count:
 *                   type: number
 */
productRouter.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllProducts),
);

/**
 * @swagger
 * /products/categories/list:
 *   get:
 *     summary: Get all categories (helper endpoint)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
productRouter.get(
  "/categories/list",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllCategories),
);

/**
 * @swagger
 * /products/discount-types/list:
 *   get:
 *     summary: Get all discount types (helper endpoint)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discount types retrieved successfully
 */
productRouter.get(
  "/discount-types/list",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllDiscountTypes),
);

/**
 * @swagger
 * /products/discounts/list:
 *   get:
 *     summary: Get all product discounts with filters, sort, search
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: subCategoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: discountTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, value, productName, discountTypeName, startDate, endDate, createdAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Product discounts list
 */
productRouter.get(
  "/discounts/list",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllProductDiscounts),
);

/**
 * @swagger
 * /products/{id}/discounts:
 *   get:
 *     summary: Get active discounts for a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product discounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 discounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       value:
 *                         type: number
 *                       valueType:
 *                         type: string
 *                         enum: [PERCENTAGE, FLAT]
 *                       discountType:
 *                         type: string
 *                       discountTypeId:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Product not found
 */
productRouter.get(
  "/:id/discounts",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getProductDiscounts),
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
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
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
productRouter.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getProductById),
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
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
 *               costPrice:
 *                 type: number
 *               mrp:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
productRouter.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.updateProduct),
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
productRouter.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.deleteProduct),
);

export default productRouter;
