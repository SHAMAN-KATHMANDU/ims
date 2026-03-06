import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanLimits } from "@/middlewares/enforcePlanLimits";
import { uploadAttachment, uploadSingle } from "@/config/multer.config";
import contactController from "./contact.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const contactRouter = Router();

contactRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /contacts/tags:
 *   get:
 *     summary: Get contact tags
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Tags list }
 */
contactRouter.get("/tags", asyncHandler(contactController.getTags));

/**
 * @swagger
 * /contacts/tags:
 *   post:
 *     summary: Create contact tag
 *     tags: [Contacts]
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
 *       201: { description: Tag created }
 */
contactRouter.post(
  "/tags",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(contactController.createTag),
);

/**
 * @swagger
 * /contacts:
 *   post:
 *     summary: Create contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               companyId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Contact created }
 */
contactRouter.post(
  "/",
  enforcePlanLimits("customers"),
  asyncHandler(contactController.create),
);

/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Get all contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contacts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedContactsResponse'
 */
contactRouter.get("/", asyncHandler(contactController.getAll));

/**
 * @swagger
 * /contacts/export:
 *   get:
 *     summary: Export contacts CSV
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: CSV file }
 */
contactRouter.get("/export", asyncHandler(contactController.exportCsv));

/**
 * @swagger
 * /contacts/import:
 *   post:
 *     summary: Import contacts from CSV
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Import result }
 */
contactRouter.post(
  "/import",
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  asyncHandler(contactController.importCsv),
);

/**
 * @swagger
 * /contacts/{id}:
 *   get:
 *     summary: Get contact by ID
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Contact details }
 *       404: { description: Not found }
 */
contactRouter.get("/:id", asyncHandler(contactController.getById));

/**
 * @swagger
 * /contacts/{id}:
 *   put:
 *     summary: Update contact
 *     tags: [Contacts]
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
 *               email: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200: { description: Contact updated }
 */
contactRouter.put("/:id", asyncHandler(contactController.update));

/**
 * @swagger
 * /contacts/{id}:
 *   delete:
 *     summary: Delete contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Contact deleted }
 */
contactRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(contactController.delete),
);

/**
 * @swagger
 * /contacts/{id}/notes:
 *   post:
 *     summary: Add note to contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       201: { description: Note added }
 */
contactRouter.post("/:id/notes", asyncHandler(contactController.addNote));

/**
 * @swagger
 * /contacts/{id}/notes/{noteId}:
 *   delete:
 *     summary: Delete contact note
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Note deleted }
 */
contactRouter.delete(
  "/:id/notes/:noteId",
  asyncHandler(contactController.deleteNote),
);

/**
 * @swagger
 * /contacts/{id}/attachments:
 *   post:
 *     summary: Add attachment to contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Attachment added }
 */
contactRouter.post(
  "/:id/attachments",
  uploadAttachment,
  asyncHandler(contactController.addAttachment),
);

/**
 * @swagger
 * /contacts/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete contact attachment
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Attachment deleted }
 */
contactRouter.delete(
  "/:id/attachments/:attachmentId",
  asyncHandler(contactController.deleteAttachment),
);

/**
 * @swagger
 * /contacts/{id}/communications:
 *   post:
 *     summary: Add communication to contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string }
 *               content: { type: string }
 *               date: { type: string, format: date-time }
 *     responses:
 *       201: { description: Communication added }
 */
contactRouter.post(
  "/:id/communications",
  asyncHandler(contactController.addCommunication),
);

export default contactRouter;
