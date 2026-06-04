import fs from "fs";
import csvParser from "csv-parser";
import ExcelJS from "exceljs";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";
import { normalizePhoneOptional } from "@/utils/phone";
import { createError } from "@/middlewares/errorHandler";
import { createPaginationResult } from "@/utils/pagination";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import {
  assertEntityExists,
  resolveNamedLookup,
} from "@/shared/validation/reference-validator";
import contactRepository from "./contact.repository";
import crmSettingsRepository from "../crm-settings/crm-settings.repository";
import type {
  CreateContactDto,
  UpdateContactDto,
  AddCommunicationDto,
  AddNoteDto,
} from "./contact.schema";

function deriveJourneyTypeFromDeals(
  deals:
    | Array<{
        stage?: string | null;
        status?: string | null;
        pipeline?: { name?: string | null } | null;
      }>
    | undefined,
): string | null {
  const activeDeal = deals?.find((deal) => deal.status === "OPEN");
  const pipelineName = activeDeal?.pipeline?.name?.trim();
  const stageName = activeDeal?.stage?.trim();
  if (!pipelineName || !stageName) {
    return null;
  }
  return `${pipelineName}(${stageName})`;
}

/**
 * Resolve the journey type a client should see.
 *
 * Journey type is now an editable lookup, but pipelines still produce derived
 * "Pipeline(Stage)" labels. Precedence: a stored value WINS when it is a valid
 * CrmJourneyType for the tenant (it was validated on write, so `validNames`
 * confirms it), otherwise fall back to the value derived from active deals.
 * Stale stored values that aren't real journey types (e.g. legacy pipeline
 * names) are ignored so they don't surface as bogus journey types.
 */
function withResolvedJourneyType<
  T extends {
    deals?: Array<{
      stage?: string | null;
      status?: string | null;
      pipeline?: { name?: string | null } | null;
    }>;
    journeyType?: string | null;
  },
>(contact: T, validNames: Set<string>): T {
  const stored = contact.journeyType?.trim();
  if (stored && validNames.has(stored.toLowerCase())) {
    return { ...contact, journeyType: stored };
  }
  return {
    ...contact,
    journeyType: deriveJourneyTypeFromDeals(contact.deals),
  };
}

export class ContactService {
  /** Names of valid journey types for the tenant (lower-cased) for read precedence. */
  private async getValidJourneyTypeNames(
    tenantId: string,
  ): Promise<Set<string>> {
    const rows = await crmSettingsRepository.findAllJourneyTypes(tenantId);
    return new Set(rows.map((r) => r.name.toLowerCase()));
  }

  /**
   * Validate and normalize reference fields before a create/update so the
   * website, REST API, and MCP all reject invalid references identically.
   * - FK ids (companyId, memberId, tagIds) must exist for the tenant.
   * - Named lookups (source, journeyType) must match an existing CrmSource /
   *   CrmJourneyType; the canonical (correctly-cased) name is written back.
   *   A missing lookup throws a ReferenceError carrying the valid options.
   * Only fields actually present on `data` are checked (supports partial update).
   */
  private async validateReferences(
    tenantId: string,
    data: Partial<CreateContactDto>,
  ): Promise<void> {
    if (data.companyId) {
      await assertEntityExists({
        tenantId,
        kind: "company",
        id: data.companyId,
        fieldName: "companyId",
      });
    }
    if (data.memberId) {
      await assertEntityExists({
        tenantId,
        kind: "member",
        id: data.memberId,
        fieldName: "memberId",
      });
    }
    if (Array.isArray(data.tagIds) && data.tagIds.length > 0) {
      await assertEntityExists({
        tenantId,
        kind: "contact_tag",
        id: data.tagIds,
        fieldName: "tagIds",
      });
    }
    if (data.source) {
      const resolved = await resolveNamedLookup({
        tenantId,
        kind: "crm_source",
        value: data.source,
      });
      data.source = resolved.name;
    }
    if (data.journeyType) {
      const resolved = await resolveNamedLookup({
        tenantId,
        kind: "crm_journey_type",
        value: data.journeyType,
      });
      data.journeyType = resolved.name;
    }
  }

  async create(tenantId: string, data: CreateContactDto, userId: string) {
    await this.validateReferences(tenantId, data);
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
    const contact = await contactRepository.create(
      tenantId,
      data,
      userId,
      phoneNormalized,
    );

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "crm.contact.created",
        scopeType: "GLOBAL",
        entityType: "CONTACT",
        entityId: contact.id,
        actorUserId: userId,
        dedupeKey: `crm-contact-created:${contact.id}`,
        payload: {
          contactId: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          companyId: contact.companyId ?? null,
          memberId: contact.memberId ?? null,
          source: contact.source ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          contactId: contact.id,
          eventName: "crm.contact.created",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return contact;
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    const [result, validNames] = await Promise.all([
      contactRepository.findAll(tenantId, query),
      this.getValidJourneyTypeNames(tenantId),
    ]);
    return {
      ...result,
      data: result.data.map((contact) =>
        withResolvedJourneyType(contact, validNames),
      ),
    };
  }

  async getById(tenantId: string, id: string) {
    const contact = await contactRepository.findById(tenantId, id);
    if (!contact) throw createError("Contact not found", 404);
    const validNames = await this.getValidJourneyTypeNames(tenantId);
    return withResolvedJourneyType(contact, validNames);
  }

  async update(tenantId: string, id: string, data: UpdateContactDto) {
    const existing = await contactRepository.findById(tenantId, id);
    if (!existing) throw createError("Contact not found", 404);
    await this.validateReferences(tenantId, data);

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
    const contact = await contactRepository.getAfterUpdate(id);

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "crm.contact.updated",
        scopeType: "GLOBAL",
        entityType: "CONTACT",
        entityId: contact.id,
        actorUserId: null,
        dedupeKey: `crm-contact-updated:${contact.id}:${contact.updatedAt.toISOString()}`,
        payload: {
          contactId: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          companyId: contact.companyId ?? null,
          memberId: contact.memberId ?? null,
          source: contact.source ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          contactId: contact.id,
          eventName: "crm.contact.updated",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return contact;
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await contactRepository.findById(tenantId, id);
    if (!existing) throw createError("Contact not found", 404);

    const taskRepository = (await import("../tasks/task.repository")).default;
    await taskRepository.completeManyByContactId(id);

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

  async getTags(
    tenantId: string,
    query?: { page?: number; limit?: number; search?: string },
  ) {
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const tags = await contactRepository.findTags(tenantId);
      return { tags };
    }
    const [tags, totalItems] = await Promise.all([
      contactRepository.findTagsPaginated(
        tenantId,
        (page - 1) * limit,
        limit,
        search,
      ),
      contactRepository.countTags(tenantId, search),
    ]);
    const result = createPaginationResult(tags, totalItems, page, limit);
    return { tags: result.data, pagination: result.pagination };
  }

  async createTag(tenantId: string, name: string) {
    return contactRepository.createTag(tenantId, name.trim());
  }

  async updateTag(tenantId: string, id: string, name: string) {
    const tag = await contactRepository.updateTag(id, tenantId, name);
    if (!tag) throw createError("Tag not found", 404);
    return tag;
  }

  async deleteTag(tenantId: string, id: string) {
    const tag = await contactRepository.deleteTag(id, tenantId);
    if (!tag) throw createError("Tag not found", 404);
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
        journeyType:
          deriveJourneyTypeFromDeals(
            c.deals as Array<{
              stage?: string | null;
              status?: string | null;
              pipeline?: { name?: string | null } | null;
            }>,
          ) || "",
      });
    }

    return workbook.xlsx.writeBuffer();
  }
}

export default new ContactService();
