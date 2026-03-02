import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { normalizePhoneRequired, parseAndValidatePhone } from "@/utils/phone";
import ExcelJS from "exceljs";
import fs from "fs";
import {
  excelMemberRowSchema,
  type ExcelMemberRow,
} from "./bulkUpload.validation";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import { sendControllerError } from "@/utils/controllerError";

class MemberController {
  // Create a new member
  async createMember(req: Request, res: Response) {
    try {
      const { phone, name, email, notes } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhoneRequired(phone);
      } catch (err: unknown) {
        return res.status(400).json({
          message: err instanceof Error ? err.message : "Invalid phone number",
        });
      }

      const tenantId = req.user!.tenantId;

      const existingMember = await prisma.member.findFirst({
        where: { phone: normalizedPhone, tenantId },
      });

      if (existingMember) {
        return res.status(409).json({
          message: "Member with this phone number already exists",
          member: existingMember,
        });
      }

      const member = await prisma.member.create({
        data: {
          tenantId,
          phone: normalizedPhone,
          name: name || null,
          email: email || null,
          notes: notes || null,
        },
      });

      res.status(201).json({
        message: "Member created successfully",
        member,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create member error");
    }
  }

  // Get all members with pagination and search
  async getAllMembers(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      const allowedSortFields = ["createdAt", "updatedAt", "name", "id"];

      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      // Build search filter — always scope to tenant
      const where: any = { tenantId, deletedAt: null };
      if (search) {
        where.OR = [
          { phone: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and members in parallel
      const [totalItems, members] = await Promise.all([
        prisma.member.count({ where }),
        prisma.member.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { sales: true },
            },
          },
        }),
      ]);

      const result = createPaginationResult(members, totalItems, page, limit);

      res.status(200).json({
        message: "Members fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all members error");
    }
  }

  // Get member by phone number
  async getMemberByPhone(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      const parsed = parseAndValidatePhone(phone);
      if (!parsed.valid) {
        const err = parsed as { valid: false; message: string };
        return res.status(400).json({ message: err.message });
      }
      const normalizedPhone = parsed.e164;

      const member = await prisma.member.findFirst({
        where: { phone: normalizedPhone, tenantId, deletedAt: null },
        include: {
          _count: {
            select: { sales: true },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get member by phone error");
    }
  }

  // Get member by ID
  async getMemberById(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const member = await prisma.member.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          sales: {
            orderBy: { createdAt: "desc" },
            include: {
              location: {
                select: { id: true, name: true },
              },
              items: {
                include: {
                  variation: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { sales: true },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get member by ID error");
    }
  }

  // Update member
  async updateMember(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { phone, name, email, notes, isActive } = req.body;

      const existingMember = await prisma.member.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existingMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      const updateData: any = {};

      if (phone !== undefined) {
        let normalizedPhone: string;
        try {
          normalizedPhone = normalizePhoneRequired(phone);
        } catch (err: unknown) {
          return res.status(400).json({
            message:
              err instanceof Error ? err.message : "Invalid phone number",
          });
        }
        if (normalizedPhone !== existingMember.phone) {
          const phoneExists = await prisma.member.findFirst({
            where: { phone: normalizedPhone, tenantId },
          });
          if (phoneExists) {
            return res.status(409).json({
              message: "Phone number already taken by another member",
            });
          }
        }
        updateData.phone = normalizedPhone;
      }

      if (name !== undefined) updateData.name = name || null;
      if (email !== undefined) updateData.email = email || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedMember = await prisma.member.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: { sales: true },
          },
        },
      });

      res.status(200).json({
        message: "Member updated successfully",
        member: updatedMember,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update member error");
    }
  }

  // Check if phone number is a member (quick lookup for sales)
  async checkMember(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      const parsed = parseAndValidatePhone(phone);
      if (!parsed.valid) {
        const err = parsed as { valid: false; message: string };
        return res.status(400).json({ message: err.message });
      }
      const normalizedPhone = parsed.e164;

      const member = await prisma.member.findFirst({
        where: { phone: normalizedPhone, tenantId, deletedAt: null },
        select: {
          id: true,
          phone: true,
          name: true,
          isActive: true,
        },
      });

      res.status(200).json({
        isMember: !!member && member.isActive,
        member: member || null,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Check member error");
    }
  }

  async bulkUploadMembers(req: Request, res: Response) {
    const tenantId = req.user!.tenantId;
    const createdMembers: { id: string; phone: string; name: string | null }[] =
      [];
    const skippedMembers: {
      phone: string;
      name: string | null;
      reason: string;
    }[] = [];

    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          created: [],
          skipped: [],
          errors: [],
        });
      }

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

      let result: { rows: ExcelMemberRow[]; errors: ValidationError[] };
      try {
        result = await parseBulkFile<ExcelMemberRow>(
          req.file.path,
          req.file.originalname,
          {
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
          },
        );
      } catch (err: any) {
        if (err?.status && err?.body) {
          return res.status(err.status).json(err.body);
        }
        throw err;
      }

      const { rows, errors } = result;

      for (const r of rows) {
        try {
          const parsed = parseAndValidatePhone(r.phone);
          if (!parsed.valid) {
            const err = parsed as { valid: false; message: string };
            errors.push({
              row: rows.indexOf(r) + 2,
              message: err.message,
            });
            continue;
          }
          const normalizedPhone = parsed.e164;

          if (r.id) {
            const existingById = await prisma.member.findFirst({
              where: { id: r.id, tenantId },
            });
            if (existingById) {
              skippedMembers.push({
                phone: normalizedPhone,
                name: r.name,
                reason: `Member with ID "${r.id}" (member_id) already exists`,
              });
              continue;
            }
          }

          const existingByPhone = await prisma.member.findFirst({
            where: { phone: normalizedPhone, tenantId },
          });
          if (existingByPhone) {
            skippedMembers.push({
              phone: normalizedPhone,
              name: r.name,
              reason: `Member with phone "${normalizedPhone}" already exists`,
            });
            continue;
          }

          const member = await prisma.member.create({
            data: {
              tenantId: req.user!.tenantId,
              ...(r.id && { id: r.id }),
              phone: normalizedPhone,
              name: r.name ?? null,
              address: r.address ?? null,
              notes: r.notes ?? null,
              birthday: r.dob ?? undefined,
              memberSince: r.memberSince ?? undefined,
            },
          });

          createdMembers.push({
            id: member.id,
            phone: member.phone,
            name: member.name,
          });
        } catch (error: any) {
          errors.push({
            row: rows.indexOf(r) + 2,
            message: error.message || "Error creating member",
          });
          skippedMembers.push({
            phone: r.phone,
            name: r.name,
            reason: error.message || "Error creating member",
          });
        }
      }

      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Error cleaning up file:", e);
      }

      res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: rows.length,
          created: createdMembers.length,
          skipped: skippedMembers.length,
          errors: errors.length,
        },
        created: createdMembers,
        skipped: skippedMembers,
        errors,
      });
    } catch (error: unknown) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      return sendControllerError(req, res, error, "Bulk upload members error");
    }
  }

  // Download bulk upload template (headers only)
  async downloadBulkUploadTemplate(req: Request, res: Response) {
    try {
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

      const filename = "members_bulk_upload_template.xlsx";
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  }

  // Download members as Excel or CSV
  async downloadMembers(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toLowerCase() || "excel";
      const idsParam = req.query.ids as string | undefined;

      // Validate format
      if (format !== "excel" && format !== "csv") {
        return res.status(400).json({
          message: "Invalid format. Supported formats: excel, csv",
        });
      }

      // Parse member IDs from query string
      let memberIds: string[] | undefined;
      if (idsParam) {
        memberIds = idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      // Build where clause — always scope to tenant
      const where: any = { tenantId, deletedAt: null };
      if (memberIds && memberIds.length > 0) {
        where.id = { in: memberIds };
      }

      // Fetch members with relations
      const members = await prisma.member.findMany({
        where,
        include: {
          _count: {
            select: {
              sales: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (members.length === 0) {
        return res.status(404).json({
          message: "No members found to export",
        });
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Members");

      // Define columns
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

      worksheet.columns = columns;

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      members.forEach((member) => {
        worksheet.addRow({
          phone: member.phone,
          name: member.name || "N/A",
          email: member.email || "N/A",
          status: member.isActive ? "Active" : "Inactive",
          totalSales: member._count?.sales || 0,
          gender: member.gender || "N/A",
          age: member.age || "N/A",
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

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `members_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

      // Set response headers
      if (format === "excel") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Generate buffer and send
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      } else {
        // CSV format
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Helper function to escape CSV values
        const escapeCsvValue = (value: any): string => {
          if (value === null || value === undefined) {
            return "";
          }
          const str = String(value);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Build CSV rows
        const csvRows: string[] = [];

        // Header row
        csvRows.push(
          columns.map((col) => escapeCsvValue(col.header)).join(","),
        );

        // Data rows
        members.forEach((member) => {
          csvRows.push(
            [
              member.phone,
              member.name || "N/A",
              member.email || "N/A",
              member.isActive ? "Active" : "Inactive",
              member._count?.sales || 0,
              member.gender || "N/A",
              member.age || "N/A",
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

        res.send(csvRows.join("\n"));
      }
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download members error");
    }
  }
}

export default new MemberController();
