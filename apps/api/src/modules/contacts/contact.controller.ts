import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import ExcelJS from "exceljs";
import csvParser from "csv-parser";
import fs from "fs";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

class ContactController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { firstName, lastName, email, phone, companyId, memberId, tagIds } =
        req.body;
      if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({ message: "First name is required" });
      }

      const contact = await prisma.contact.create({
        data: {
          tenantId,
          firstName: firstName.trim(),
          lastName: lastName?.trim() || null,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          companyId: companyId || null,
          memberId: memberId || null,
          ownedById: userId,
          createdById: userId,
          tagLinks:
            Array.isArray(tagIds) && tagIds.length > 0
              ? {
                  create: tagIds
                    .filter((id: string) => typeof id === "string")
                    .map((tagId: string) => ({ tagId })),
                }
              : undefined,
        },
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, username: true } },
          tagLinks: { include: { tag: { select: { id: true, name: true } } } },
        },
      });

      res
        .status(201)
        .json({ message: "Contact created successfully", contact });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create contact error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );
      const companyId = req.query.companyId as string | undefined;
      const tagId = req.query.tagId as string | undefined;
      const ownerId = req.query.ownerId as string | undefined;

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "firstName",
        "lastName",
        "email",
        "id",
      ];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      const where: Record<string, unknown> = { tenantId };
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ];
      }
      if (companyId) where.companyId = companyId;
      if (tagId) {
        where.tagLinks = { some: { tagId } };
      }
      if (ownerId) where.ownedById = ownerId;

      const skip = (page - 1) * limit;

      const [totalItems, contacts] = await Promise.all([
        prisma.contact.count({ where }),
        prisma.contact.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            company: { select: { id: true, name: true } },
            owner: { select: { id: true, username: true } },
            tagLinks: {
              include: { tag: { select: { id: true, name: true } } },
            },
            _count: { select: { deals: true, tasks: true } },
          },
        }),
      ]);

      const result = createPaginationResult(contacts, totalItems, page, limit);
      res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get contacts error");
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
        include: {
          company: true,
          member: {
            select: { id: true, name: true, phone: true, email: true },
          },
          owner: { select: { id: true, username: true } },
          tagLinks: { include: { tag: { select: { id: true, name: true } } } },
          notes: {
            orderBy: { createdAt: "desc" },
            include: { creator: { select: { id: true, username: true } } },
          },
          attachments: {
            orderBy: { createdAt: "desc" },
            include: { uploader: { select: { id: true, username: true } } },
          },
          communications: {
            orderBy: { createdAt: "desc" },
            include: { creator: { select: { id: true, username: true } } },
          },
          deals: {
            select: {
              id: true,
              name: true,
              value: true,
              stage: true,
              status: true,
              expectedCloseDate: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              completed: true,
              assignedTo: { select: { id: true, username: true } },
            },
          },
        },
      });

      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.status(200).json({ message: "OK", contact });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get contact by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { firstName, lastName, email, phone, companyId, memberId, tagIds } =
        req.body;

      const existing = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await prisma.$transaction(async (tx) => {
        const updateData: Record<string, unknown> = {
          ...(firstName !== undefined && {
            firstName: firstName?.trim() || existing.firstName,
          }),
          ...(lastName !== undefined && { lastName: lastName?.trim() || null }),
          ...(email !== undefined && { email: email?.trim() || null }),
          ...(phone !== undefined && { phone: phone?.trim() || null }),
          ...(companyId !== undefined && { companyId: companyId || null }),
          ...(memberId !== undefined && { memberId: memberId || null }),
        };

        if (Array.isArray(tagIds)) {
          await tx.contactTagLink.deleteMany({ where: { contactId: id } });
          if (tagIds.length > 0) {
            await tx.contactTagLink.createMany({
              data: tagIds
                .filter((tid: string) => typeof tid === "string")
                .map((tagId: string) => ({ contactId: id, tagId })),
            });
          }
        }

        await tx.contact.update({
          where: { id },
          data: updateData,
        });
      });

      const contact = await prisma.contact.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, username: true } },
          tagLinks: { include: { tag: { select: { id: true, name: true } } } },
        },
      });

      res
        .status(200)
        .json({ message: "Contact updated successfully", contact });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update contact error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      const existing = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await prisma.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Contact deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete contact error");
    }
  }

  async addNote(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Note content is required" });
      }

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!contact)
        return res.status(404).json({ message: "Contact not found" });

      const note = await prisma.contactNote.create({
        data: {
          contactId: id,
          content: content.trim(),
          createdById: userId,
        },
        include: { creator: { select: { id: true, username: true } } },
      });

      res.status(201).json({ message: "Note added", note });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Add note error");
    }
  }

  async deleteNote(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id, noteId } = req.params;

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!contact)
        return res.status(404).json({ message: "Contact not found" });

      const note = await prisma.contactNote.findFirst({
        where: { id: noteId, contactId: id },
      });
      if (!note) return res.status(404).json({ message: "Note not found" });

      await prisma.contactNote.delete({ where: { id: noteId } });
      res.status(200).json({ message: "Note deleted" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete note error");
    }
  }

  async addAttachment(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!contact)
        return res.status(404).json({ message: "Contact not found" });

      const filePath =
        "attachments/" + (file.filename || file.originalname || "file");

      const attachment = await prisma.contactAttachment.create({
        data: {
          contactId: id,
          fileName: file.originalname || file.filename || "file",
          filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedById: userId,
        },
        include: { uploader: { select: { id: true, username: true } } },
      });

      res.status(201).json({ message: "Attachment added", attachment });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Add attachment error");
    }
  }

  async deleteAttachment(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id, attachmentId } = req.params;

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!contact)
        return res.status(404).json({ message: "Contact not found" });

      const attachment = await prisma.contactAttachment.findFirst({
        where: { id: attachmentId, contactId: id },
      });
      if (!attachment)
        return res.status(404).json({ message: "Attachment not found" });

      const fullPath = require("path").join(
        process.cwd(),
        "uploads",
        attachment.filePath,
      );
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      await prisma.contactAttachment.delete({ where: { id: attachmentId } });
      res.status(200).json({ message: "Attachment deleted" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete attachment error");
    }
  }

  async addCommunication(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { type, subject, notes } = req.body;

      const validTypes = ["CALL", "EMAIL", "MEETING"];
      if (!type || !validTypes.includes(type)) {
        return res
          .status(400)
          .json({ message: "Valid type (CALL, EMAIL, MEETING) is required" });
      }

      const contact = await prisma.contact.findFirst({
        where: { id, tenantId },
      });
      if (!contact)
        return res.status(404).json({ message: "Contact not found" });

      const communication = await prisma.contactCommunication.create({
        data: {
          contactId: id,
          type,
          subject: subject?.trim() || null,
          notes: notes?.trim() || null,
          createdById: userId,
        },
        include: { creator: { select: { id: true, username: true } } },
      });

      res.status(201).json({ message: "Communication logged", communication });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Add communication error");
    }
  }

  async getTags(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const tags = await prisma.contactTag.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      res.status(200).json({ message: "OK", tags });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tags error");
    }
  }

  async createTag(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Tag name is required" });
      }

      const existing = await prisma.contactTag.findUnique({
        where: { tenantId_name: { tenantId, name: name.trim() } },
      });
      if (existing) {
        return res.status(200).json({ message: "OK", tag: existing });
      }

      const tag = await prisma.contactTag.create({
        data: { tenantId, name: name.trim() },
      });
      res.status(201).json({ message: "Tag created", tag });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create tag error");
    }
  }

  async importCsv(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const rows: Array<{
        firstName: string;
        lastName?: string;
        email?: string;
        phone?: string;
        companyName?: string;
      }> = [];

      await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(file.path);
        stream
          .pipe(csvParser())
          .on("data", (row: Record<string, string>) => {
            const firstName =
              row.firstName || row["First Name"] || row.first_name || "";
            if (firstName.trim()) {
              rows.push({
                firstName: String(firstName).trim(),
                lastName:
                  (
                    row.lastName ||
                    row["Last Name"] ||
                    row.last_name ||
                    ""
                  ).trim() || undefined,
                email: (row.email || row.Email || "").trim() || undefined,
                phone: (row.phone || row.Phone || "").trim() || undefined,
                companyName:
                  (
                    row.companyName ||
                    row.Company ||
                    row.company_name ||
                    ""
                  ).trim() || undefined,
              });
            }
          })
          .on("end", () => resolve())
          .on("error", reject);
      });

      let created = 0;
      for (const row of rows) {
        let companyId: string | null = null;
        if (row.companyName) {
          let company = await prisma.company.findFirst({
            where: { tenantId, name: row.companyName },
            select: { id: true },
          });
          if (!company) {
            company = await prisma.company.create({
              data: { tenantId, name: row.companyName },
              select: { id: true },
            });
          }
          companyId = company.id;
        }

        await prisma.contact.create({
          data: {
            tenantId,
            firstName: row.firstName,
            lastName: row.lastName || null,
            email: row.email || null,
            phone: row.phone || null,
            companyId,
            ownedById: userId,
            createdById: userId,
          },
        });
        created++;
      }

      fs.unlinkSync(file.path);

      res.status(200).json({
        message: `Imported ${created} contacts`,
        created,
        total: rows.length,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Import contacts error");
    }
  }

  async exportCsv(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const tenantId = req.user!.tenantId;
      const ids = req.query.ids as string | undefined;
      const contactIds = ids ? ids.split(",").filter(Boolean) : undefined;

      const where: Record<string, unknown> = { tenantId };
      if (contactIds && contactIds.length > 0) {
        where.id = { in: contactIds };
      }

      const contacts = await prisma.contact.findMany({
        where,
        include: {
          company: { select: { name: true } },
          tagLinks: { include: { tag: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Contacts");
      sheet.columns = [
        { header: "First Name", key: "firstName", width: 20 },
        { header: "Last Name", key: "lastName", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Company", key: "companyName", width: 25 },
        { header: "Tags", key: "tags", width: 30 },
      ];

      for (const c of contacts) {
        sheet.addRow({
          firstName: c.firstName,
          lastName: c.lastName || "",
          email: c.email || "",
          phone: c.phone || "",
          companyName: c.company?.name || "",
          tags: c.tagLinks.map((l) => l.tag.name).join(", "),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contacts-${Date.now()}.xlsx"`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(Buffer.from(buffer));
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Export contacts error");
    }
  }
}

export default new ContactController();
