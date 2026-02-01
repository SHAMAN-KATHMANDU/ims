import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import productController from "@/modules/products/product.controller";
import { uploadSingle } from "@/config/multer.config";

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
  productController.createProduct,
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
  "/",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getAllProducts,
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
  productController.getAllCategories,
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
  productController.getAllDiscountTypes,
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
  productController.getAllProductDiscounts,
);

/**
 * @swagger
 * /products/download:
 *   get:
 *     summary: Download products as Excel or CSV
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, csv]
 *           default: excel
 *         description: Export format (excel or csv)
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of product IDs to export. If not provided, exports all products.
 *         example: "id1,id2,id3"
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid format
 *       404:
 *         description: No products found
 */
productRouter.get(
  "/download",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.downloadProducts,
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
  productController.getProductById,
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
  productController.updateProduct,
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
  productController.deleteProduct,
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
  productController.getProductDiscounts,
  );

/**
 * @swagger
 * /products/bulk-upload/template:
 *   get:
 *     summary: Download bulk upload template (Excel with headers)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
productRouter.get(
  "/bulk-upload/template",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.downloadBulkUploadTemplate,
);

/**
 * @swagger
 * /products/bulk-upload:
 *   post:
 *     summary: Bulk upload products from Excel file
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx, .xls, .xlsm) containing product data
 *     responses:
 *       200:
 *         description: Bulk upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     created:
 *                       type: number
 *                     skipped:
 *                       type: number
 *                     errors:
 *                       type: number
 *                 created:
 *                   type: array
 *                   items:
 *                     type: object
 *                 skipped:
 *                   type: array
 *                   items:
 *                     type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
productRouter.post(
  "/bulk-upload",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  productController.bulkUploadProducts,
);

export default productRouter;
