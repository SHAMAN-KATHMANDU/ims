import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";
import {
  excelMemberRowSchema,
  type ExcelMemberRow,
  type ValidationError,
} from "./bulkUpload.validation";

class MemberController {
  // Create a new member
  async createMember(req: Request, res: Response) {
    try {
      const { phone, name, email, notes } = req.body;

      // Validate required fields
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Normalize phone number (remove spaces, dashes)
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      // Check if member already exists
      const existingMember = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingMember) {
        return res.status(409).json({
          message: "Member with this phone number already exists",
          member: existingMember,
        });
      }

      const member = await prisma.member.create({
        data: {
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
    } catch (error: any) {
      console.error("Create member error:", error);
      res
        .status(500)
        .json({ message: "Error creating member", error: error.message });
    }
  }

  // Get all members with pagination and search
  async getAllMembers(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Allowed fields for sorting (date added = createdAt); sorting at DB level
      const allowedSortFields = [
        "createdAt", // date added
        "updatedAt",
        "name",
        "phone",
        "id",
      ];

      // Get orderBy for Prisma (sortOrder: asc | desc)
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      // Build search filter
      const where: any = {};
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
    } catch (error: any) {
      console.error("Get all members error:", error);
      res
        .status(500)
        .json({ message: "Error fetching members", error: error.message });
    }
  }

  // Get member by phone number
  async getMemberByPhone(req: Request, res: Response) {
    try {
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      // Normalize phone number
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      const member = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
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
    } catch (error: any) {
      console.error("Get member by phone error:", error);
      res
        .status(500)
        .json({ message: "Error fetching member", error: error.message });
    }
  }

  // Get member by ID
  async getMemberById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const member = await prisma.member.findUnique({
        where: { id },
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
                          imsCode: true,
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
    } catch (error: any) {
      console.error("Get member by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching member", error: error.message });
    }
  }

  // Update member
  async updateMember(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { phone, name, email, notes, isActive } = req.body;

      // Check if member exists
      const existingMember = await prisma.member.findUnique({
        where: { id },
      });

      if (!existingMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Prepare update data
      const updateData: any = {};

      if (phone !== undefined) {
        const normalizedPhone = phone.replace(/[\s-]/g, "").trim();
        // Check if new phone is already taken by another member
        if (normalizedPhone !== existingMember.phone) {
          const phoneExists = await prisma.member.findUnique({
            where: { phone: normalizedPhone },
          });

          if (phoneExists) {
            return res.status(409).json({
              message: "Phone number already taken by another member",
            });
          }
        }
        updateData.phone = normalizedPhone;
      }

      if (name !== undefined) {
        updateData.name = name || null;
      }

      if (email !== undefined) {
        updateData.email = email || null;
      }

      if (notes !== undefined) {
        updateData.notes = notes || null;
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

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
    } catch (error: any) {
      console.error("Update member error:", error);
      res
        .status(500)
        .json({ message: "Error updating member", error: error.message });
    }
  }

  // Check if phone number is a member (quick lookup for sales)
  async checkMember(req: Request, res: Response) {
    try {
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      // Normalize phone number
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      const member = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
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
    } catch (error: any) {
      console.error("Check member error:", error);
      res
        .status(500)
        .json({ message: "Error checking member", error: error.message });
    }
  }

  // Bulk upload members from Excel or CSV file
  async bulkUploadMembers(req: Request, res: Response) {
    const errors: ValidationError[] = [];
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

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const isCSV = fileExt === ".csv";

      const normalizeHeader = (header: string): string => {
        return header
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "")
          .replace(/\s+/g, "");
      };

      const headerMappings: Record<string, string[]> = {
        sn: ["sn", "sno", "serial", "serialnumber", "s n"],
        id: ["id"],
        name: ["name"],
        address: ["address"],
        phone: ["phonenumber", "phone", "phoneno", "mobile", "contact"],
        dob: ["dob", "dateofbirth", "birthday", "birthdate"],
        notes: ["notes"],
        memberSince: ["membersince", "member_since"],
      };

      const requiredColumns = ["phone"];
      let rows: ExcelMemberRow[] = [];

      if (isCSV) {
        const csvRows: Record<string, any>[] = [];
        const csvColumnMap: Record<string, string> = {};

        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row: Record<string, any>) => csvRows.push(row))
            .on("end", () => resolve())
            .on("error", reject);
        });

        if (csvRows.length === 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "CSV file is empty or invalid",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        const csvHeaders = Object.keys(csvRows[0] || {});
        for (const csvHeader of csvHeaders) {
          const normalized = normalizeHeader(csvHeader);
          let bestMatch: { fieldName: string; priority: number } | null = null;
          for (const [fieldName, variations] of Object.entries(
            headerMappings,
          )) {
            if (csvColumnMap[fieldName]) continue;
            if (variations.some((v) => normalized === v)) {
              bestMatch = { fieldName, priority: 2 };
              break;
            }
            if (
              !bestMatch &&
              variations.some(
                (v) => normalized.includes(v) || v.includes(normalized),
              )
            ) {
              bestMatch = { fieldName, priority: 1 };
            }
          }
          if (bestMatch) csvColumnMap[bestMatch.fieldName] = csvHeader;
        }

        const missingColumns = requiredColumns.filter(
          (col) => !csvColumnMap[col],
        );
        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in CSV file",
            missingColumns,
            foundColumns: Object.keys(csvColumnMap),
            hint: "Required: Phone number. Optional: SN, ID (maps to member_id; must be valid UUID), Name, Address, DoB, Notes, Member since.",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        csvRows.forEach((csvRow, rowIndex) => {
          const getCellValue = (fieldName: string) => {
            const col = csvColumnMap[fieldName];
            if (!col) return undefined;
            const value = csvRow[col];
            return value === "" || value === null ? undefined : value;
          };
          const rowData = {
            sn: getCellValue("sn"),
            id: getCellValue("id"),
            name: getCellValue("name"),
            address: getCellValue("address"),
            phone: getCellValue("phone"),
            dob: getCellValue("dob"),
            notes: getCellValue("notes"),
            memberSince: getCellValue("memberSince"),
          };
          const hasData = Object.values(rowData).some(
            (v) =>
              v !== null &&
              v !== undefined &&
              String(v).trim() !== "" &&
              String(v) !== "-",
          );
          if (!hasData) return;
          try {
            rows.push(excelMemberRowSchema.parse(rowData));
          } catch (error: any) {
            if (error instanceof z.ZodError) {
              error.errors.forEach((err: any) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key: string) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex + 2,
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex + 2,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Excel file must contain at least one worksheet",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        const columnMap: Record<string, number> = {};
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          if (cell.value) {
            const headerValue = String(cell.value).trim();
            const normalized = normalizeHeader(headerValue);
            let bestMatch: { fieldName: string; priority: number } | null =
              null;
            for (const [fieldName, variations] of Object.entries(
              headerMappings,
            )) {
              if (columnMap[fieldName]) continue;
              if (variations.some((v) => normalized === v)) {
                bestMatch = { fieldName, priority: 2 };
                break;
              }
              if (
                !bestMatch &&
                variations.some(
                  (v) => normalized.includes(v) || v.includes(normalized),
                )
              ) {
                bestMatch = { fieldName, priority: 1 };
              }
            }
            if (bestMatch) columnMap[bestMatch.fieldName] = colNumber;
          }
        });

        const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in Excel file",
            missingColumns,
            foundColumns: Object.keys(columnMap),
            hint: "Required: Phone number. Optional: SN, ID (maps to member_id; must be valid UUID), Name, Address, DoB, Notes, Member since.",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        worksheet.eachRow((row, rowIndex) => {
          if (rowIndex === 1) return;
          const getCellValue = (fieldName: string) => {
            const colNumber = columnMap[fieldName];
            return colNumber ? row.getCell(colNumber).value : undefined;
          };
          const rowData = {
            sn: getCellValue("sn"),
            id: getCellValue("id"),
            name: getCellValue("name"),
            address: getCellValue("address"),
            phone: getCellValue("phone"),
            dob: getCellValue("dob"),
            notes: getCellValue("notes"),
            memberSince: getCellValue("memberSince"),
          };
          const hasData = Object.values(rowData).some(
            (v) =>
              v !== null &&
              v !== undefined &&
              String(v).trim() !== "" &&
              String(v) !== "-",
          );
          if (!hasData) return;
          try {
            rows.push(excelMemberRowSchema.parse(rowData));
          } catch (error: any) {
            if (error instanceof z.ZodError) {
              error.errors.forEach((err: any) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key: string) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex,
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      }

      for (const r of rows) {
        try {
          const normalizedPhone = r.phone.replace(/[\s-]/g, "").trim();

          if (r.id) {
            const existingById = await prisma.member.findUnique({
              where: { id: r.id },
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

          const existingByPhone = await prisma.member.findUnique({
            where: { phone: normalizedPhone },
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
        fs.unlinkSync(filePath);
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
    } catch (error: any) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      console.error("Bulk upload members error:", error);
      res.status(500).json({
        message: "Error processing bulk upload",
        error: error.message,
        summary: {
          total: 0,
          created: createdMembers.length,
          skipped: skippedMembers.length,
          errors: errors.length,
        },
        created: createdMembers,
        skipped: skippedMembers,
        errors,
      });
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
    } catch (error: any) {
      console.error("Download template error:", error);
      res.status(500).json({
        message: "Error generating template",
        error: error.message,
      });
    }
  }

  // Download members as Excel or CSV
  async downloadMembers(req: Request, res: Response) {
    try {
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

      // Build where clause
      const where: any = {};
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
    } catch (error: any) {
      console.error("Download members error:", error);
      res
        .status(500)
        .json({ message: "Error downloading members", error: error.message });
    }
  }
}

export default new MemberController();
