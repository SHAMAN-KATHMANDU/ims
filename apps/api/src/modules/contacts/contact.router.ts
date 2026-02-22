import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanLimits } from "@/middlewares/planLimitMiddleware";
import { uploadAttachment, uploadSingle } from "@/config/multer.config";
import contactController from "./contact.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  addContactCommunicationSchema,
  addContactNoteSchema,
  contactExportQuerySchema,
  contactIdParamsSchema,
  contactListQuerySchema,
  createContactSchema,
  createTagSchema,
  updateContactSchema,
} from "./contact.schema";

const contactRouter = Router();

contactRouter.use(verifyToken);
contactRouter.use(authorizeRoles("user", "admin", "superAdmin"));

contactRouter.get("/tags", asyncHandler(contactController.getTags));
contactRouter.post(
  "/tags",
  authorizeRoles("admin", "superAdmin"),
  validateBody(createTagSchema),
  asyncHandler(contactController.createTag),
);
contactRouter.post(
  "/",
  enforcePlanLimits("contacts"),
  validateBody(createContactSchema),
  asyncHandler(contactController.create),
);
contactRouter.get(
  "/",
  validateQuery(contactListQuerySchema),
  asyncHandler(contactController.getAll),
);
contactRouter.get(
  "/export",
  validateQuery(contactExportQuerySchema),
  asyncHandler(contactController.exportCsv),
);
contactRouter.post(
  "/import",
  authorizeRoles("admin", "superAdmin"),
  enforcePlanLimits("contacts"),
  uploadSingle,
  asyncHandler(contactController.importCsv),
);
contactRouter.get(
  "/:id",
  validateParams(contactIdParamsSchema),
  asyncHandler(contactController.getById),
);
contactRouter.put(
  "/:id",
  validateParams(contactIdParamsSchema),
  validateBody(updateContactSchema),
  asyncHandler(contactController.update),
);
contactRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  validateParams(contactIdParamsSchema),
  asyncHandler(contactController.delete),
);

contactRouter.post(
  "/:id/notes",
  validateParams(contactIdParamsSchema),
  validateBody(addContactNoteSchema),
  asyncHandler(contactController.addNote),
);
contactRouter.delete(
  "/:id/notes/:noteId",
  asyncHandler(contactController.deleteNote),
);
contactRouter.post(
  "/:id/attachments",
  validateParams(contactIdParamsSchema),
  uploadAttachment,
  asyncHandler(contactController.addAttachment),
);
contactRouter.delete(
  "/:id/attachments/:attachmentId",
  asyncHandler(contactController.deleteAttachment),
);
contactRouter.post(
  "/:id/communications",
  validateParams(contactIdParamsSchema),
  validateBody(addContactCommunicationSchema),
  asyncHandler(contactController.addCommunication),
);

export default contactRouter;
