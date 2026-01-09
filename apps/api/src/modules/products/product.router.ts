import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import productController from "@/modules/products/product.controller";

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
  '/',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.createProduct
);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
  '/',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getAllProducts
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
  '/:id',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getProductById
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
  '/:id',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.updateProduct
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
  '/:id',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.deleteProduct
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
  '/categories/list',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getAllCategories
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
  '/discount-types/list',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getAllDiscountTypes
);

export default productRouter;
