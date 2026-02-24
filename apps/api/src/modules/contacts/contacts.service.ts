/**
 * Contacts service: business logic for contacts, notes, attachments, communications, tags.
 * Uses repository only for data; file storage (local uploads/) and CSV/Excel in this layer.
 */

import path from "path";
import fs from "fs";
import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { NotFoundError, AppError } from "@/shared/errors";
import * as repo from "./contacts.repository";

export type CreateContactInput = {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  memberId?: string | null;
  tagIds?: string[];
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type ListContactsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  companyId?: string;
  tagId?: string;
  ownerId?: string;
};

export async function create(
  tenantId: string,
  userId: string,
  input: CreateContactInput,
) {
  const tagIds = Array.isArray(input.tagIds)
    ? input.tagIds.filter((id): id is string => typeof id === "string")
    : undefined;
  return repo.createContact({
    tenantId,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    companyId: input.companyId ?? null,
    memberId: input.memberId ?? null,
    ownedById: userId,
    createdById: userId,
    tagIds,
  });
}

export async function getAll(tenantId: string, query: ListContactsQuery) {
  const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
    query as Parameters<typeof getPaginationParams>[0],
  );
  const { companyId, tagId, ownerId } = query;

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "firstName",
    "lastName",
    "email",
    "id",
  ];
  const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) ?? {
    createdAt: "desc",
  };

  const where: Prisma.ContactWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (companyId) where.companyId = companyId;
  if (tagId) where.tagLinks = { some: { tagId } };
  if (ownerId) where.ownedById = ownerId;

  const skip = (page - 1) * limit;

  const [totalItems, contacts] = await Promise.all([
    repo.countContacts(tenantId, where),
    repo.findContacts(tenantId, where, orderBy, skip, limit),
  ]);

  return createPaginationResult(contacts, totalItems, page, limit);
}

export async function getById(tenantId: string, id: string) {
  const contact = await repo.findContactById(tenantId, id);
  if (!contact) throw new NotFoundError("Contact not found");
  return contact;
}

export async function update(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
) {
  const existing = await repo.findContactByIdForUpdate(tenantId, id);
  if (!existing) throw new NotFoundError("Contact not found");

  const updateData: Prisma.ContactUpdateInput = {
    ...(input.firstName !== undefined && {
      firstName: input.firstName?.trim() || existing.firstName,
    }),
    ...(input.lastName !== undefined && {
      lastName: input.lastName?.trim() ?? null,
    }),
    ...(input.email !== undefined && { email: input.email?.trim() ?? null }),
    ...(input.phone !== undefined && { phone: input.phone?.trim() ?? null }),
    ...(input.companyId !== undefined && {
      companyId: input.companyId ?? null,
    }),
    ...(input.memberId !== undefined && { memberId: input.memberId ?? null }),
  };

  const tagIds = Array.isArray(input.tagIds)
    ? input.tagIds.filter((id): id is string => typeof id === "string")
    : undefined;

  await repo.updateContactWithTags(id, updateData, tagIds);
  const contact = await repo.findContactAfterUpdate(tenantId, id);
  if (!contact) throw new NotFoundError("Contact not found");
  return contact;
}

export async function deleteContact(tenantId: string, id: string) {
  const existing = await repo.findContactByIdForUpdate(tenantId, id);
  if (!existing) throw new NotFoundError("Contact not found");
  await repo.softDeleteContact(id);
}

export async function addNote(
  tenantId: string,
  userId: string,
  contactId: string,
  content: string,
) {
  const contact = await repo.findContactByIdForUpdate(tenantId, contactId);
  if (!contact) throw new NotFoundError("Contact not found");
  return repo.createNote(contactId, content, userId);
}

export async function deleteNote(
  tenantId: string,
  contactId: string,
  noteId: string,
) {
  const contact = await repo.findContactByIdForUpdate(tenantId, contactId);
  if (!contact) throw new NotFoundError("Contact not found");
  const note = await repo.findNote(noteId, contactId);
  if (!note) throw new NotFoundError("Note not found");
  await repo.deleteNote(noteId);
}

export type AttachmentFile = {
  originalname?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  size?: number;
  mimetype?: string;
};

export async function addAttachment(
  tenantId: string,
  userId: string,
  contactId: string,
  file: AttachmentFile,
) {
  const contact = await repo.findContactByIdForUpdate(tenantId, contactId);
  if (!contact) throw new NotFoundError("Contact not found");

  const safeName = (file.originalname || file.filename || "file")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 80);
  const filePath = `attachments/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
  const fullPath = path.join(process.cwd(), "uploads", filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  if (file.path) {
    fs.copyFileSync(file.path, fullPath);
  } else if (file.buffer) {
    fs.writeFileSync(fullPath, file.buffer);
  }

  return repo.createAttachment({
    contactId,
    fileName: file.originalname || file.filename || "file",
    filePath,
    fileSize: file.size,
    mimeType: file.mimetype ?? null,
    uploadedById: userId,
  });
}

export async function deleteAttachment(
  tenantId: string,
  contactId: string,
  attachmentId: string,
) {
  const contact = await repo.findContactByIdForUpdate(tenantId, contactId);
  if (!contact) throw new NotFoundError("Contact not found");
  const attachment = await repo.findAttachment(attachmentId, contactId);
  if (!attachment) throw new NotFoundError("Attachment not found");

  const fullPath = path.join(process.cwd(), "uploads", attachment.filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await repo.deleteAttachment(attachmentId);
}

export async function addCommunication(
  tenantId: string,
  userId: string,
  contactId: string,
  input: { type: string; subject?: string | null; notes?: string | null },
) {
  const contact = await repo.findContactByIdForUpdate(tenantId, contactId);
  if (!contact) throw new NotFoundError("Contact not found");
  return repo.createCommunication({
    contactId,
    type: input.type,
    subject: input.subject ?? null,
    notes: input.notes ?? null,
    createdById: userId,
  });
}

export async function getTags(tenantId: string) {
  return repo.findTags(tenantId);
}

export async function createTag(tenantId: string, name: string) {
  const existing = await repo.findTagByName(tenantId, name);
  if (existing) return { tag: existing, created: false };
  const tag = await repo.createTag(tenantId, name);
  return { tag, created: true };
}

export async function exportContacts(
  tenantId: string,
  contactIds?: string[],
): Promise<{ buffer: Buffer; filename: string }> {
  const ExcelJS = (await import("exceljs")).default;
  const contacts = await repo.findContactsForExport(tenantId, contactIds);
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
  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return {
    buffer,
    filename: `contacts-${Date.now()}.xlsx`,
  };
}

export async function importCsv(
  tenantId: string,
  userId: string,
  filePath: string,
): Promise<{ created: number; total: number }> {
  const csvParser = (await import("csv-parser")).default;

  const rows: Array<{
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
  }> = [];

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
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
      let company = await repo.findCompanyByName(tenantId, row.companyName);
      if (!company) {
        company = await repo.createCompany(tenantId, row.companyName);
      }
      companyId = company.id;
    }

    await repo.createContact({
      tenantId,
      firstName: row.firstName,
      lastName: row.lastName ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      companyId,
      memberId: null,
      ownedById: userId,
      createdById: userId,
    });
    created++;
  }

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return { created, total: rows.length };
}
