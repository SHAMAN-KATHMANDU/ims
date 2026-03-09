import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import attributeTypeController from "./attribute-type.controller";

const router = Router();

router.use(authorizeRoles("admin", "superAdmin"));

/**
 * @swagger
 * /attribute-types:
 *   get:
 *     summary: List all attribute types
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attribute types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 attributeTypes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AttributeType' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get("/", asyncHandler(attributeTypeController.list));

/**
 * @swagger
 * /attribute-types:
 *   post:
 *     summary: Create an attribute type
 *     tags: [AttributeTypes]
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
 *               name: { type: string, maxLength: 100 }
 *               code: { type: string }
 *               displayOrder: { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Attribute type created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post("/", asyncHandler(attributeTypeController.create));

/**
 * @swagger
 * /attribute-types/{typeId}/values:
 *   get:
 *     summary: List values for an attribute type
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attribute values retrieved
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Attribute type not found }
 */
router.get("/:typeId/values", asyncHandler(attributeTypeController.listValues));

/**
 * @swagger
 * /attribute-types/{typeId}/values:
 *   post:
 *     summary: Create an attribute value
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string, maxLength: 255 }
 *               code: { type: string, maxLength: 50, nullable: true }
 *               displayOrder: { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Attribute value created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Attribute type not found }
 */
router.post(
  "/:typeId/values",
  asyncHandler(attributeTypeController.createValue),
);

/**
 * @swagger
 * /attribute-types/{typeId}/values/{valueId}:
 *   put:
 *     summary: Update an attribute value
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: valueId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value: { type: string }
 *               code: { type: string, nullable: true }
 *               displayOrder: { type: integer }
 *     responses:
 *       200:
 *         description: Attribute value updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Value not found }
 */
router.put(
  "/:typeId/values/:valueId",
  asyncHandler(attributeTypeController.updateValue),
);

/**
 * @swagger
 * /attribute-types/{typeId}/values/{valueId}:
 *   delete:
 *     summary: Delete an attribute value
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: valueId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attribute value deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Value not found }
 */
router.delete(
  "/:typeId/values/:valueId",
  asyncHandler(attributeTypeController.deleteValue),
);

/**
 * @swagger
 * /attribute-types/{id}:
 *   get:
 *     summary: Get attribute type by ID
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attribute type retrieved
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Attribute type not found }
 */
router.get("/:id", asyncHandler(attributeTypeController.getById));

/**
 * @swagger
 * /attribute-types/{id}:
 *   put:
 *     summary: Update an attribute type
 *     tags: [AttributeTypes]
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
 *               code: { type: string }
 *               displayOrder: { type: integer }
 *     responses:
 *       200:
 *         description: Attribute type updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Attribute type not found }
 */
router.put("/:id", asyncHandler(attributeTypeController.update));

/**
 * @swagger
 * /attribute-types/{id}:
 *   delete:
 *     summary: Delete an attribute type
 *     tags: [AttributeTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attribute type deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Attribute type not found }
 */
router.delete("/:id", asyncHandler(attributeTypeController.delete));

export default router;
