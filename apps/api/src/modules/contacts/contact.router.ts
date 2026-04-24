import { Router, Request } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  enforcePlanLimits,
  enforcePlanFeature,
} from "@/middlewares/enforcePlanLimits";
import { uploadSingle } from "@/config/multer.config";
import contactController from "./contact.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const contactRouter = Router();

contactRouter.use(authorizeRoles("user", "admin", "superAdmin"));
contactRouter.use(enforcePlanFeature("salesPipeline"));

const workspaceLocator = (): string => "WORKSPACE";
const idLocator = (req: Request): string => req.params.id;

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
contactRouter.get(
  "/tags",
  requirePermission("CRM.CONTACTS.VIEW", workspaceLocator),
  asyncHandler(contactController.getTags),
);

/**
 * @swagger
 * /contacts/tags:
 *   post:
 *     summary: Create contact tag
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Tag created }
 */
contactRouter.post(
  "/tags",
  requirePermission("CRM.CONTACTS.UPDATE", workspaceLocator),
  asyncHandler(contactController.createTag),
);

contactRouter.patch(
  "/tags/:tagId",
  requirePermission("CRM.CONTACTS.UPDATE", workspaceLocator),
  asyncHandler(contactController.updateTag),
);

contactRouter.delete(
  "/tags/:tagId",
  requirePermission("CRM.CONTACTS.UPDATE", workspaceLocator),
  asyncHandler(contactController.deleteTag),
);

/**
 * @swagger
 * /contacts:
 *   post:
 *     summary: Create contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Contact created }
 */
contactRouter.post(
  "/",
  requirePermission("CRM.CONTACTS.CREATE", workspaceLocator),
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
 *     responses:
 *       200: { description: Contacts list }
 */
contactRouter.get(
  "/",
  requirePermission("CRM.CONTACTS.VIEW", workspaceLocator),
  asyncHandler(contactController.getAll),
);

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
contactRouter.get(
  "/export",
  requirePermission("CRM.CONTACTS.EXPORT", workspaceLocator),
  asyncHandler(contactController.exportCsv),
);

/**
 * @swagger
 * /contacts/import:
 *   post:
 *     summary: Import contacts from CSV
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Import result }
 */
contactRouter.post(
  "/import",
  requirePermission("CRM.CONTACTS.IMPORT", workspaceLocator),
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
 *     responses:
 *       200: { description: Contact details }
 *       404: { description: Not found }
 */
contactRouter.get(
  "/:id",
  requirePermission("CRM.CONTACTS.VIEW", idLocator),
  asyncHandler(contactController.getById),
);

/**
 * @swagger
 * /contacts/{id}:
 *   put:
 *     summary: Update contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Contact updated }
 */
contactRouter.put(
  "/:id",
  requirePermission("CRM.CONTACTS.UPDATE", idLocator),
  asyncHandler(contactController.update),
);

/**
 * @swagger
 * /contacts/{id}:
 *   delete:
 *     summary: Delete contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Contact deleted }
 */
contactRouter.delete(
  "/:id",
  requirePermission("CRM.CONTACTS.DELETE", idLocator),
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
 *     responses:
 *       201: { description: Note added }
 */
contactRouter.post(
  "/:id/notes",
  requirePermission("CRM.CONTACT_NOTES.CREATE", idLocator),
  asyncHandler(contactController.addNote),
);

/**
 * @swagger
 * /contacts/{id}/notes/{noteId}:
 *   delete:
 *     summary: Delete contact note
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Note deleted }
 */
contactRouter.delete(
  "/:id/notes/:noteId",
  requirePermission("CRM.CONTACT_NOTES.DELETE", (req) => req.params.noteId),
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
 *     responses:
 *       201: { description: Attachment added }
 */
contactRouter.post(
  "/:id/attachments",
  requirePermission("CRM.CONTACTS.UPDATE", idLocator),
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
 *     responses:
 *       200: { description: Attachment deleted }
 */
contactRouter.delete(
  "/:id/attachments/:attachmentId",
  requirePermission("CRM.CONTACTS.UPDATE", idLocator),
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
 *     responses:
 *       201: { description: Communication added }
 */
contactRouter.post(
  "/:id/communications",
  requirePermission("CRM.CONTACT_COMMUNICATIONS.CREATE", idLocator),
  asyncHandler(contactController.addCommunication),
);

export default contactRouter;
