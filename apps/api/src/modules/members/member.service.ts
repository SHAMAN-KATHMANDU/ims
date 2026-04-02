import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { parseAndValidatePhone } from "@/utils/phone";
import memberRepository, {
  type MemberRepository,
  type MemberWhere,
  type UpdateMemberRepoData,
} from "./member.repository";
import type { CreateMemberDto, UpdateMemberDto } from "./member.schema";
import {
  excelMemberRowSchema,
  type ExcelMemberRow,
} from "./bulkUpload.validation";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import ExcelJS from "exceljs";

const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "id",
  "phone",
] as const;

export interface BulkUploadResult {
  created: { id: string; phone: string; name: string | null }[];
  skipped: { phone: string; name: string | null; reason: string }[];
  errors: ValidationError[];
  rows: ExcelMemberRow[];
}

export interface DownloadTemplateResult {
  buffer: Buffer;
  filename: string;
}

export interface DownloadMembersResult {
  buffer: Buffer | string;
  filename: string;
  contentType: string;
}

export class MemberService {
  constructor(private repo: MemberRepository) {}

  async create(tenantId: string, data: CreateMemberDto) {
    const existing = await this.repo.findExistingByPhone(tenantId, data.phone);
    if (existing) {
      return { existing, member: null };
    }
    const member = await this.repo.create({
      tenantId,
      phone: data.phone,
      name: data.name ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
    });

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "members.member.created",
        scopeType: "GLOBAL",
        entityType: "MEMBER",
        entityId: member.id,
        actorUserId: null,
        dedupeKey: `member-created:${member.id}`,
        payload: {
          memberId: member.id,
          phone: member.phone,
          name: member.name ?? null,
          email: member.email ?? null,
          isActive: member.isActive,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          memberId: member.id,
          eventName: "members.member.created",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return { existing: null, member };
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(rawQuery);

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      createdAt: "desc",
    };

    const where: MemberWhere = { tenantId, deletedAt: null };
    const memberStatus = rawQuery.memberStatus as string | undefined;
    if (
      memberStatus &&
      ["ACTIVE", "INACTIVE", "PROSPECT", "VIP"].includes(memberStatus)
    ) {
      where.memberStatus = memberStatus as MemberWhere["memberStatus"];
    }
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const { members, totalItems } = await this.repo.findAll(
      where,
      orderBy,
      skip,
      limit,
    );

    return createPaginationResult(members, totalItems, page, limit);
  }

  async findByPhone(tenantId: string, phone: string) {
    return this.repo.findByPhone(tenantId, phone);
  }

  async findById(tenantId: string, id: string) {
    return this.repo.findByIdWithSales(tenantId, id);
  }

  async update(tenantId: string, id: string, data: UpdateMemberDto) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name ?? null;
    if (data.email !== undefined) updateData.email = data.email ?? null;
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.phone !== undefined) {
      if (data.phone !== existing.phone) {
        const phoneExists = await this.repo.findExistingByPhone(
          tenantId,
          data.phone,
        );
        if (phoneExists) return { conflict: true, member: null };
      }
      updateData.phone = data.phone;
    }

    const member = await this.repo.update(
      id,
      updateData as UpdateMemberRepoData,
    );

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "members.member.updated",
        scopeType: "GLOBAL",
        entityType: "MEMBER",
        entityId: member.id,
        actorUserId: null,
        dedupeKey: `member-updated:${member.id}:${member.updatedAt.toISOString()}`,
        payload: {
          memberId: member.id,
          phone: member.phone,
          name: member.name ?? null,
          email: member.email ?? null,
          isActive: member.isActive,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          memberId: member.id,
          eventName: "members.member.updated",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    if (
      existing.isActive !== undefined &&
      member.isActive !== undefined &&
      existing.isActive !== member.isActive
    ) {
      await automationService
        .publishDomainEvent({
          tenantId,
          eventName: "members.member.status_changed",
          scopeType: "GLOBAL",
          entityType: "MEMBER",
          entityId: member.id,
          actorUserId: null,
          dedupeKey: `member-status-changed:${member.id}:${member.updatedAt.toISOString()}`,
          payload: {
            memberId: member.id,
            previousIsActive: existing.isActive,
            isActive: member.isActive,
          },
        })
        .catch((error) => {
          logger.error("Automation event publishing failed", undefined, {
            tenantId,
            memberId: member.id,
            eventName: "members.member.status_changed",
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    return { conflict: false, member };
  }

  async checkMember(tenantId: string, phone: string) {
    return this.repo.checkMember(tenantId, phone);
  }

  async bulkUpload(
    tenantId: string,
    filePath: string,
    originalName: string,
  ): Promise<BulkUploadResult> {
    const memberFields = [
      "sn",
      "id",
      "name",
      "address",
      "phone",
      "dob",
      "notes",
      "memberSince",
    ];

    const result = await parseBulkFile<ExcelMemberRow>(filePath, originalName, {
      headerMappings: {
        sn: ["sn", "sno", "serial", "serialnumber", "s n"],
        id: ["id"],
        name: ["name"],
        address: ["address"],
        phone: ["phonenumber", "phone", "phoneno", "mobile", "contact"],
        dob: ["dob", "dateofbirth", "birthday", "birthdate"],
        notes: ["notes"],
        memberSince: ["membersince", "member_since"],
      },
      requiredColumns: ["phone"],
      schema: excelMemberRowSchema,
      fields: memberFields,
      skipExcelRows: 1,
      missingColumnsHint:
        "Required: Phone number. Optional: SN, ID (maps to member_id; must be valid UUID), Name, Address, DoB, Notes, Member since.",
    });

    const { rows, errors } = result;
    const createdMembers: { id: string; phone: string; name: string | null }[] =
      [];
    const skippedMembers: {
      phone: string;
      name: string | null;
      reason: string;
    }[] = [];

    for (const r of rows) {
      try {
        const parsed = parseAndValidatePhone(r.phone);
        if (!parsed.valid) {
          const err = parsed as { valid: false; message: string };
          errors.push({ row: rows.indexOf(r) + 2, message: err.message });
          continue;
        }
        const normalizedPhone = parsed.e164;

        if (r.id) {
          const existingById = await this.repo.findExistingById(tenantId, r.id);
          if (existingById) {
            skippedMembers.push({
              phone: normalizedPhone,
              name: r.name,
              reason: `Member with ID "${r.id}" (member_id) already exists`,
            });
            continue;
          }
        }

        const existingByPhone = await this.repo.findExistingByPhone(
          tenantId,
          normalizedPhone,
        );
        if (existingByPhone) {
          skippedMembers.push({
            phone: normalizedPhone,
            name: r.name,
            reason: `Member with phone "${normalizedPhone}" already exists`,
          });
          continue;
        }

        const member = await this.repo.create({
          tenantId,
          ...(r.id && { id: r.id }),
          phone: normalizedPhone,
          name: r.name ?? null,
          address: r.address ?? null,
          notes: r.notes ?? null,
          birthday: r.dob ?? undefined,
          memberSince: r.memberSince ?? undefined,
        });

        createdMembers.push({
          id: member.id,
          phone: member.phone,
          name: member.name,
        });
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Error creating member";
        errors.push({ row: rows.indexOf(r) + 2, message: msg });
        skippedMembers.push({
          phone: r.phone,
          name: r.name,
          reason: msg,
        });
      }
    }

    return {
      created: createdMembers,
      skipped: skippedMembers,
      errors,
      rows,
    };
  }

  async downloadBulkUploadTemplate(): Promise<DownloadTemplateResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Members Template");

    const headers = [
      { header: "SN", width: 8 },
      { header: "ID (member_id UUID)", width: 22 },
      { header: "Name", width: 20 },
      { header: "Address", width: 25 },
      { header: "Phone", width: 15 },
      { header: "DoB", width: 12 },
      { header: "Notes", width: 25 },
      { header: "Member since", width: 15 },
    ];
    const requiredOptional = [
      "Optional",
      "Optional",
      "Optional",
      "Optional",
      "Required",
      "Optional",
      "Optional",
      "Optional",
    ];

    worksheet.columns = headers.map((h) => ({
      header: h.header,
      width: h.width,
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    const row2 = worksheet.getRow(2);
    requiredOptional.forEach((text, i) => {
      row2.getCell(i + 1).value = text;
    });
    row2.font = { italic: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      filename: "members_bulk_upload_template.xlsx",
    };
  }

  async downloadMembers(
    tenantId: string,
    format: "excel" | "csv",
    memberIds?: string[],
  ): Promise<DownloadMembersResult> {
    const members = await this.repo.findForExport(tenantId, memberIds);

    if (members.length === 0) {
      throw createError("No members found to export", 404);
    }

    const columns = [
      { header: "Phone", key: "phone", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Status", key: "status", width: 12 },
      { header: "Total Sales", key: "totalSales", width: 12 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Age", key: "age", width: 10 },
      { header: "Address", key: "address", width: 40 },
      { header: "Birthday", key: "birthday", width: 15 },
      { header: "Member Since", key: "memberSince", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Notes", key: "notes", width: 40 },
    ];

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `members_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Members");
      worksheet.columns = columns;
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      members.forEach((member) => {
        worksheet.addRow({
          phone: member.phone,
          name: member.name || "N/A",
          email: member.email || "N/A",
          status: member.isActive ? "Active" : "Inactive",
          totalSales: member._count?.sales || 0,
          gender: member.gender || "N/A",
          age: member.age ?? "N/A",
          address: member.address || "N/A",
          birthday: member.birthday
            ? new Date(member.birthday).toLocaleDateString()
            : "N/A",
          memberSince: member.memberSince
            ? new Date(member.memberSince).toLocaleDateString()
            : "N/A",
          createdAt: new Date(member.createdAt).toLocaleString(),
          notes: member.notes || "N/A",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer: Buffer.from(buffer),
        filename,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    const escapeCsvValue = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [];
    csvRows.push(columns.map((col) => escapeCsvValue(col.header)).join(","));
    members.forEach((member) => {
      csvRows.push(
        [
          member.phone,
          member.name || "N/A",
          member.email || "N/A",
          member.isActive ? "Active" : "Inactive",
          member._count?.sales || 0,
          member.gender || "N/A",
          member.age ?? "N/A",
          member.address || "N/A",
          member.birthday
            ? new Date(member.birthday).toLocaleDateString()
            : "N/A",
          member.memberSince
            ? new Date(member.memberSince).toLocaleDateString()
            : "N/A",
          new Date(member.createdAt).toLocaleString(),
          member.notes || "N/A",
        ]
          .map(escapeCsvValue)
          .join(","),
      );
    });

    return {
      buffer: csvRows.join("\n"),
      filename,
      contentType: "text/csv; charset=utf-8",
    };
  }
}

export default new MemberService(memberRepository);
