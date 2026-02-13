import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { uploadAttachment, uploadSingle } from "@/config/multer.config";
import contactController from "./contact.controller";

const contactRouter = Router();

contactRouter.use(verifyToken);
contactRouter.use(authorizeRoles("user", "admin", "superAdmin"));

contactRouter.get("/tags", contactController.getTags);
contactRouter.post(
  "/tags",
  authorizeRoles("admin", "superAdmin"),
  contactController.createTag,
);
contactRouter.post("/", contactController.create);
contactRouter.get("/", contactController.getAll);
contactRouter.get("/export", contactController.exportCsv);
contactRouter.post(
  "/import",
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  contactController.importCsv,
);
contactRouter.get("/:id", contactController.getById);
contactRouter.put("/:id", contactController.update);
contactRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  contactController.delete,
);

contactRouter.post("/:id/notes", contactController.addNote);
contactRouter.delete("/:id/notes/:noteId", contactController.deleteNote);
contactRouter.post(
  "/:id/attachments",
  uploadAttachment,
  contactController.addAttachment,
);
contactRouter.delete(
  "/:id/attachments/:attachmentId",
  contactController.deleteAttachment,
);
contactRouter.post("/:id/communications", contactController.addCommunication);

export default contactRouter;
