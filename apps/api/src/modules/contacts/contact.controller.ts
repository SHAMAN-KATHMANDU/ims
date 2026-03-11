import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreateContactSchema,
  UpdateContactSchema,
  CreateTagSchema,
  UpdateTagSchema,
  AddNoteSchema,
  AddCommunicationSchema,
} from "./contact.schema";
import contactService from "./contact.service";

class ContactController {
  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = CreateContactSchema.parse(req.body);
      const contact = await contactService.create(tenantId, body, userId);
      return res
        .status(201)
        .json({ message: "Contact created successfully", contact });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Create contact error");
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await contactService.getAll(
        tenantId,
        req.query as Record<string, unknown>,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get contacts error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const contact = await contactService.getById(tenantId, req.params.id);
      return res.status(200).json({ message: "OK", contact });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get contact by id error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateContactSchema.parse(req.body);
      const contact = await contactService.update(
        tenantId,
        req.params.id,
        body,
      );
      return res
        .status(200)
        .json({ message: "Contact updated successfully", contact });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update contact error");
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await contactService.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete contact error");
    }
  };

  getTags = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const tags = await contactService.getTags(tenantId);
      return res.status(200).json({ message: "OK", tags });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tags error");
    }
  };

  createTag = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { name } = CreateTagSchema.parse(req.body);
      const { tag, created } = await contactService.createTag(tenantId, name);
      return res
        .status(created ? 201 : 200)
        .json({ message: created ? "Tag created" : "OK", tag });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Create tag error");
    }
  };

  updateTag = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { name } = UpdateTagSchema.parse(req.body);
      const tag = await contactService.updateTag(
        tenantId,
        req.params.tagId,
        name,
      );
      return res.status(200).json({ message: "OK", tag });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update tag error");
    }
  };

  deleteTag = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await contactService.deleteTag(tenantId, req.params.tagId);
      return res.status(200).json({ message: "Tag deleted" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete tag error");
    }
  };

  addNote = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = AddNoteSchema.parse(req.body);
      const note = await contactService.addNote(
        tenantId,
        req.params.id,
        body,
        userId,
      );
      return res.status(201).json({ message: "Note added", note });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Add note error");
    }
  };

  deleteNote = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await contactService.deleteNote(
        tenantId,
        req.params.id,
        req.params.noteId,
      );
      return res.status(200).json({ message: "Note deleted" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete note error");
    }
  };

  addAttachment = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const attachment = await contactService.addAttachment(
        tenantId,
        req.params.id,
        file,
        userId,
      );
      return res.status(201).json({ message: "Attachment added", attachment });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Add attachment error");
    }
  };

  deleteAttachment = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await contactService.deleteAttachment(
        tenantId,
        req.params.id,
        req.params.attachmentId,
      );
      return res.status(200).json({ message: "Attachment deleted" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete attachment error");
    }
  };

  addCommunication = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = AddCommunicationSchema.parse(req.body);
      const communication = await contactService.addCommunication(
        tenantId,
        req.params.id,
        body,
        userId,
      );
      return res
        .status(201)
        .json({ message: "Communication logged", communication });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Add communication error");
    }
  };

  importCsv = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const result = await contactService.importCsv(tenantId, file, userId);
      return res.status(200).json({
        message: `Imported ${result.created} contacts`,
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Import contacts error");
    }
  };

  exportCsv = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const buffer = await contactService.exportExcel(
        tenantId,
        req.query.ids as string | undefined,
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contacts-${Date.now()}.xlsx"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      return res.send(Buffer.from(buffer));
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Export contacts error");
    }
  };
}

export default new ContactController();
