import { Request, Response } from "express";
import { ok, okPaginated, fail } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as contactsService from "./contacts.service";

class ContactController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const contact = await contactsService.create(
      auth.tenantId,
      auth.userId,
      req.body,
    );
    return ok(res, { contact }, 201, "Contact created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<contactsService.ListContactsQuery>(
      req,
      res,
    );
    const result = await contactsService.getAll(auth.tenantId, query);
    return okPaginated(res, result.data, result.pagination, "OK");
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const contact = await contactsService.getById(auth.tenantId, id);
    return ok(res, { contact }, 200, "OK");
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const contact = await contactsService.update(auth.tenantId, id, req.body);
    return ok(res, { contact }, 200, "Contact updated successfully");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    await contactsService.deleteContact(auth.tenantId, id);
    return ok(res, undefined, 200, "Contact deleted successfully");
  }

  async addNote(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const { content } = req.body;
    const note = await contactsService.addNote(
      auth.tenantId,
      auth.userId,
      id,
      content,
    );
    return ok(res, { note }, 201, "Note added");
  }

  async deleteNote(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id, noteId } = req.params;
    await contactsService.deleteNote(auth.tenantId, id, noteId);
    return ok(res, undefined, 200, "Note deleted");
  }

  async addAttachment(req: Request, res: Response) {
    const auth = req.authContext!;

    const file = (req as any).file;
    if (!file) return fail(res, "No file uploaded", 400);

    const { id } = req.params;
    const attachment = await contactsService.addAttachment(
      auth.tenantId,
      auth.userId,
      id,
      file,
    );
    return ok(res, { attachment }, 201, "Attachment added");
  }

  async deleteAttachment(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id, attachmentId } = req.params;
    await contactsService.deleteAttachment(auth.tenantId, id, attachmentId);
    return ok(res, undefined, 200, "Attachment deleted");
  }

  async addCommunication(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params;
    const communication = await contactsService.addCommunication(
      auth.tenantId,
      auth.userId,
      id,
      req.body,
    );
    return ok(res, { communication }, 201, "Communication logged");
  }

  async getTags(req: Request, res: Response) {
    const auth = req.authContext!;

    const tags = await contactsService.getTags(auth.tenantId);
    return ok(res, { tags }, 200, "OK");
  }

  async createTag(req: Request, res: Response) {
    const auth = req.authContext!;

    const { name } = req.body;
    const { tag, created } = await contactsService.createTag(
      auth.tenantId,
      name,
    );
    return ok(
      res,
      { tag },
      created ? 201 : 200,
      created ? "Tag created" : "OK",
    );
  }

  async importCsv(req: Request, res: Response) {
    const auth = req.authContext!;

    const file = (req as any).file;
    if (!file?.path) return fail(res, "No file uploaded", 400);

    const result = await contactsService.importCsv(
      auth.tenantId,
      auth.userId,
      file.path,
    );
    return ok(
      res,
      {
        message: `Imported ${result.created} contacts`,
        created: result.created,
        total: result.total,
      },
      200,
    );
  }

  async exportCsv(req: Request, res: Response) {
    const auth = req.authContext!;

    const { ids } = getValidatedQuery<{ ids?: string }>(req, res);
    const contactIds = ids ? ids.split(",").filter(Boolean) : undefined;

    const { buffer, filename } = await contactsService.exportContacts(
      auth.tenantId,
      contactIds,
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return res.send(Buffer.from(buffer));
  }
}

export default new ContactController();
