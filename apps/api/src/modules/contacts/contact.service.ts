import fs from "fs";
import csvParser from "csv-parser";
import ExcelJS from "exceljs";
import { normalizePhoneOptional } from "@/utils/phone";
import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import contactRepository from "./contact.repository";
import type {
  CreateContactDto,
  UpdateContactDto,
  AddCommunicationDto,
  AddNoteDto,
} from "./contact.schema";

export class ContactService {
  async create(tenantId: string, data: CreateContactDto, userId: string) {
    let phoneNormalized: string | null = null;
    if (data.phone && String(data.phone).trim()) {
      try {
        phoneNormalized = normalizePhoneOptional(data.phone);
      } catch (err: unknown) {
        throw createError(
          err instanceof Error ? err.message : "Invalid phone number",
          400,
        );
      }
    }
    return contactRepository.create(tenantId, data, userId, phoneNormalized);
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return contactRepository.findAll(tenantId, query);
  }

  async getById(tenantId: string, id: string) {
    const contact = await contactRepository.findById(tenantId, id);
    if (!contact) throw createError("Contact not found", 404);
    return contact;
  }

  async update(tenantId: string, id: string, data: UpdateContactDto) {
    const existing = await contactRepository.findById(tenantId, id);
    if (!existing) throw createError("Contact not found", 404);

    let phoneNormalized: string | null | undefined = undefined;
    if (data.phone !== undefined) {
      if (!data.phone || String(data.phone).trim() === "") {
        phoneNormalized = null;
      } else {
        try {
          phoneNormalized = normalizePhoneOptional(data.phone);
        } catch (err: unknown) {
          throw createError(
            err instanceof Error ? err.message : "Invalid phone number",
            400,
          );
        }
      }
    }

    await contactRepository.update(id, data, phoneNormalized);
    return contactRepository.getAfterUpdate(id);
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await contactRepository.findById(tenantId, id);
    if (!existing) throw createError("Contact not found", 404);
    await contactRepository.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Contact",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async getTags(tenantId: string) {
    return contactRepository.findTags(tenantId);
  }

  async createTag(tenantId: string, name: string) {
    return contactRepository.createTag(tenantId, name.trim());
  }

  async addNote(
    tenantId: string,
    contactId: string,
    data: AddNoteDto,
    userId: string,
  ) {
    const contact = await contactRepository.findById(tenantId, contactId);
    if (!contact) throw createError("Contact not found", 404);
    return contactRepository.addNote(contactId, data.content, userId);
  }

  async deleteNote(tenantId: string, contactId: string, noteId: string) {
    const contact = await contactRepository.findById(tenantId, contactId);
    if (!contact) throw createError("Contact not found", 404);
    const note = await contactRepository.deleteNote(contactId, noteId);
    if (!note) throw createError("Note not found", 404);
  }

  async addAttachment(
    tenantId: string,
    contactId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const contact = await contactRepository.findById(tenantId, contactId);
    if (!contact) throw createError("Contact not found", 404);
    return contactRepository.addAttachment(contactId, file, userId);
  }

  async deleteAttachment(
    tenantId: string,
    contactId: string,
    attachmentId: string,
  ) {
    const contact = await contactRepository.findById(tenantId, contactId);
    if (!contact) throw createError("Contact not found", 404);
    const attachment = await contactRepository.deleteAttachment(
      contactId,
      attachmentId,
    );
    if (!attachment) throw createError("Attachment not found", 404);

    const path = await import("path");
    const fullPath = path.join(process.cwd(), "uploads", attachment.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async addCommunication(
    tenantId: string,
    contactId: string,
    data: AddCommunicationDto,
    userId: string,
  ) {
    const contact = await contactRepository.findById(tenantId, contactId);
    if (!contact) throw createError("Contact not found", 404);
    return contactRepository.addCommunication(contactId, data, userId);
  }

  async importCsv(tenantId: string, file: Express.Multer.File, userId: string) {
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
        let company = await contactRepository.findCompanyByName(
          tenantId,
          row.companyName,
        );
        if (!company) {
          company = await contactRepository.createCompany(
            tenantId,
            row.companyName,
          );
        }
        companyId = company.id;
      }

      let phoneVal: string | null = null;
      if (row.phone?.trim()) {
        try {
          phoneVal = normalizePhoneOptional(row.phone);
        } catch {
          // Invalid phone in CSV: store null for this contact
        }
      }

      await contactRepository.createContactForImport(
        tenantId,
        {
          firstName: row.firstName,
          lastName: row.lastName || null,
          email: row.email || null,
          phone: phoneVal,
          companyId,
        },
        userId,
      );
      created++;
    }

    try {
      fs.unlinkSync(file.path);
    } catch {
      // best effort cleanup
    }

    return { created, total: rows.length };
  }

  async exportExcel(tenantId: string, ids?: string) {
    const contactIds = ids ? ids.split(",").filter(Boolean) : undefined;
    const contacts = await contactRepository.findForExport(
      tenantId,
      contactIds,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Contacts");
    sheet.columns = [
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Company", key: "companyName", width: 25 },
      { header: "Tags", key: "tags", width: 30 },
      { header: "Source", key: "source", width: 20 },
      { header: "Journey Type", key: "journeyType", width: 20 },
    ];

    for (const c of contacts) {
      sheet.addRow({
        firstName: c.firstName,
        lastName: c.lastName || "",
        email: c.email || "",
        phone: c.phone || "",
        companyName: (c.company as { name?: string } | null)?.name || "",
        tags: (c.tagLinks as Array<{ tag: { name: string } }>)
          .map((l) => l.tag.name)
          .join(", "),
        source: c.source || "",
        journeyType: c.journeyType || "",
      });
    }

    return workbook.xlsx.writeBuffer();
  }
}

export default new ContactService();
