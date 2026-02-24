import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { uploadAttachment, uploadSingle } from "@/config/multer.config";
import contactController from "./contact.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const contactRouter = Router();

contactRouter.use(authorizeRoles("user", "admin", "superAdmin"));

contactRouter.get("/tags", asyncHandler(contactController.getTags));
contactRouter.post(
  "/tags",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(contactController.createTag),
);
contactRouter.post("/", asyncHandler(contactController.create));
contactRouter.get("/", asyncHandler(contactController.getAll));
contactRouter.get("/export", asyncHandler(contactController.exportCsv));
contactRouter.post(
  "/import",
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  asyncHandler(contactController.importCsv),
);
contactRouter.get("/:id", asyncHandler(contactController.getById));
contactRouter.put("/:id", asyncHandler(contactController.update));
contactRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(contactController.delete),
);

contactRouter.post("/:id/notes", asyncHandler(contactController.addNote));
contactRouter.delete(
  "/:id/notes/:noteId",
  asyncHandler(contactController.deleteNote),
);
contactRouter.post(
  "/:id/attachments",
  uploadAttachment,
  asyncHandler(contactController.addAttachment),
);
contactRouter.delete(
  "/:id/attachments/:attachmentId",
  asyncHandler(contactController.deleteAttachment),
);
contactRouter.post(
  "/:id/communications",
  asyncHandler(contactController.addCommunication),
);

export default contactRouter;
