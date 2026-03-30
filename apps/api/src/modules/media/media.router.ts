import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import mediaController from "./media.controller";

const mediaRouter = Router();

mediaRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /media/presign:
 *   post:
 *     summary: Presign S3 PUT for direct browser upload
 *     description: |
 *       Returns a time-limited URL, object key, canonical public URL, and **contentType** to use on the PUT (and when registering the asset).
 *       **contentLength** must match the file size; the signed request enforces Content-Length and Content-Type.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose, mimeType, contentLength]
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [product_photo, contact_attachment, library]
 *               mimeType:
 *                 type: string
 *                 description: Declared MIME; application/octet-stream allowed when fileName implies an allowed extension.
 *               contentLength:
 *                 type: integer
 *                 minimum: 1
 *                 description: Exact upload size in bytes
 *               fileName:
 *                 type: string
 *               entityType:
 *                 type: string
 *                 enum: [products, contacts, library, messages]
 *               entityId:
 *                 type: string
 *                 description: Contact UUID for contact_attachment; optional draft UUID for products.
 *     responses:
 *       200:
 *         description: Presign result
 *       400:
 *         description: Validation error
 *       503:
 *         description: Object storage not configured
 */
mediaRouter.post(
  "/presign",
  asyncHandler(mediaController.presign.bind(mediaController)),
);

/**
 * @swagger
 * /media/assets:
 *   post:
 *     summary: Register uploaded object as a MediaAsset (tenant library)
 *     description: |
 *       **publicUrl** is optional; the server stores the canonical URL from PHOTOS_PUBLIC_URL_PREFIX.
 *       Duplicate **storageKey** for the tenant returns 200 with the existing asset.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storageKey, fileName, mimeType, purpose]
 *             properties:
 *               storageKey: { type: string }
 *               publicUrl: { type: string, format: uri }
 *               fileName: { type: string }
 *               mimeType: { type: string }
 *               byteSize: { type: integer }
 *               purpose:
 *                 type: string
 *                 enum: [product_photo, contact_attachment, library]
 *     responses:
 *       200:
 *         description: Existing asset (idempotent register)
 *       201:
 *         description: Created
 *   get:
 *     summary: List media assets for the tenant
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list
 */
mediaRouter.post(
  "/assets",
  asyncHandler(mediaController.register.bind(mediaController)),
);
mediaRouter.get(
  "/assets",
  asyncHandler(mediaController.list.bind(mediaController)),
);

/**
 * @swagger
 * /media/assets/{id}:
 *   delete:
 *     summary: Delete media asset (S3 object first when configured)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 *       502:
 *         description: Storage delete failed (DB unchanged)
 *       503:
 *         description: S3 not configured for delete
 */
mediaRouter.delete(
  "/assets/:id",
  asyncHandler(mediaController.remove.bind(mediaController)),
);

export default mediaRouter;
