import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { validate } from "@/middlewares/validate";
import { enforcePlanLimits } from "@/middlewares/enforcePlanLimits";
import productController from "@/modules/products/product.controller";
import { CreateProductSchema, UpdateProductSchema } from "./product.schema";
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
 *               - name
 *               - categoryId
 *               - costPrice
 *               - mrp
 *               - variations
 *             properties:
 *               imsCode:
 *                 type: string
 *                 maxLength: 100
 *                 description: Optional product code (barcode). When omitted, server assigns {workspaceSlug}-{categoryInitial}{subCategoryInitial?}{nextNumber} unique per tenant.
 *                 example: "PRD-001"
 *               name:
 *                 type: string
 *                 example: Smartphone XYZ Pro
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *               subCategory:
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
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *               defaultLocationId:
 *                 type: string
 *                 format: uuid
 *               attributeTypeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               variations:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     stockQuantity:
 *                       type: number
 *                       default: 0
 *                     costPriceOverride:
 *                       type: number
 *                     mrpOverride:
 *                       type: number
 *                     finalSpOverride:
 *                       type: number
 *                     attributes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           attributeTypeId:
 *                             type: string
 *                             format: uuid
 *                           attributeValueId:
 *                             type: string
 *                             format: uuid
 *                     subVariants:
 *                       type: array
 *                       items:
 *                         oneOf:
 *                           - type: string
 *                           - type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                     photos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           photoUrl:
 *                             type: string
 *                             format: uri
 *                           isPrimary:
 *                             type: boolean
 *               discounts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - discountTypeId
 *                     - discountPercentage
 *                   properties:
 *                     discountTypeId:
 *                       type: string
 *                       format: uuid
 *                     discountPercentage:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     valueType:
 *                       type: string
 *                       enum: [PERCENTAGE, FLAT]
 *                     value:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
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
  authorizeRoles("admin", "superAdmin"),
  enforcePlanLimits("products"),
  validate(CreateProductSchema),
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
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [dateCreated, dateModified, name, imsCode, costPrice, mrp, vendorId, id, totalStock, vendorname]
 *         description: Sort field. dateCreated = date added. Use vendorname for vendor name (relation sort). totalStock sorts by aggregated stock (location inventory + variation fallback).
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: locationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: subCategoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: subCategory
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *         description: Filter from date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *         description: Filter to date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: lowStock
 *         schema: { type: string, enum: ['true', 'false', '1', '0'] }
 *         description: Filter products with low stock only
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProductsResponse'
 */
productRouter.get(
  "/",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllProducts),
);

/**
 * @swagger
 * /products/by-ims:
 *   get:
 *     summary: Get product by product code (barcode) for POS – returns product with variations and optional location stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: imsCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional; when provided, variations include quantity at this location
 *     responses:
 *       200:
 *         description: Product with variations (and location stock when locationId provided)
 *       404:
 *         description: Product not found
 */
productRouter.get(
  "/by-ims",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getProductByIms),
);

/**
 * @swagger
 * /products/categories/list:
 *   get:
 *     summary: Get all categories (helper endpoint)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
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
 *         description: Categories retrieved successfully
 */
productRouter.get(
  "/categories/list",
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
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
 *         description: Discount types retrieved successfully
 */
productRouter.get(
  "/discount-types/list",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(productController.getAllDiscountTypes),
);

/**
 * @swagger
 * /products/discount-types:
 *   post:
 *     summary: Create a discount type (name + optional default percentage)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               defaultPercentage: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       201:
 *         description: Discount type created
 *       409:
 *         description: Name already exists
 */
productRouter.post(
  "/discount-types",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.createDiscountType),
);

/**
 * @swagger
 * /products/discount-types/{id}:
 *   put:
 *     summary: Update a discount type
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete a discount type (fails if in use by products)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
productRouter.put(
  "/discount-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.updateDiscountType),
);
productRouter.delete(
  "/discount-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.deleteDiscountType),
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
 *               imsCode:
 *                 type: string
 *                 maxLength: 100
 *                 description: Product code (barcode)
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
  authorizeRoles("admin", "superAdmin"),
  validate(UpdateProductSchema),
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
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.deleteProduct),
);

/**
 * @swagger
 * /products/{productId}/variations/{variationId}:
 *   delete:
 *     summary: Delete a single variation from a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Variation deleted successfully
 *       400:
 *         description: Cannot delete the last variation
 *       404:
 *         description: Variation not found
 *       409:
 *         description: Variation has dependent sales or transfers
 */
productRouter.delete(
  "/:productId/variations/:variationId",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(productController.deleteVariation),
);

export default productRouter;
