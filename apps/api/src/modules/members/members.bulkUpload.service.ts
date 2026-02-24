/**
 * Members bulk upload — parse Excel/CSV and create members.
 * Used by member.bulk.upload.controller.
 */

import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";
import ExcelJS from "exceljs";
import {
  excelMemberRowSchema,
  type ExcelMemberRow,
  type ValidationError,
} from "./bulkUpload.validation";
import { membersRepository } from "./members.repository";

const normalizeHeader = (header: string): string =>
  header
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");

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

export type MemberBulkUploadResult = {
  created: Array<{ id: string; phone: string; name: string | null }>;
  skipped: Array<{ phone: string; name: string | null; reason: string }>;
  errors: ValidationError[];
  summary: { total: number; created: number; skipped: number; errors: number };
};

export async function parseMemberFile(
  filePath: string,
  isCSV: boolean,
): Promise<{
  rows: ExcelMemberRow[];
  errors: ValidationError[];
  missingColumns?: string[];
  foundColumns?: string[];
}> {
  const errors: ValidationError[] = [];
  let rows: ExcelMemberRow[] = [];

  if (isCSV) {
    const csvRows: Record<string, unknown>[] = [];
    const csvColumnMap: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row: Record<string, unknown>) => csvRows.push(row))
        .on("end", () => resolve())
        .on("error", reject);
    });

    if (csvRows.length === 0) {
      return { rows: [], errors: [] };
    }

    const csvHeaders = Object.keys(csvRows[0] || {});
    for (const csvHeader of csvHeaders) {
      const normalized = normalizeHeader(csvHeader);
      for (const [fieldName, variations] of Object.entries(headerMappings)) {
        if (csvColumnMap[fieldName]) continue;
        if (variations.some((v) => normalized === v)) {
          csvColumnMap[fieldName] = csvHeader;
          break;
        }
        if (
          !csvColumnMap[fieldName] &&
          variations.some(
            (v) => normalized.includes(v) || v.includes(normalized),
          )
        ) {
          csvColumnMap[fieldName] = csvHeader;
        }
      }
    }

    const missingColumns = requiredColumns.filter((col) => !csvColumnMap[col]);
    if (missingColumns.length > 0) {
      return {
        rows: [],
        errors: [],
        missingColumns,
        foundColumns: Object.keys(csvColumnMap),
      };
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
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(
            (err: { path: (string | number)[]; message: string }) => {
              const fieldValue = err.path.reduce(
                (obj: unknown, key: string | number) =>
                  (obj as Record<string, unknown>)?.[key as string],
                rowData,
              );
              errors.push({
                row: rowIndex + 2,
                field: err.path.join("."),
                message: err.message,
                value: fieldValue,
              });
            },
          );
        } else {
          errors.push({
            row: rowIndex + 2,
            message: (error as Error).message || "Invalid row data",
          });
        }
      }
    });
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { rows: [], errors: [] };
    }

    const columnMap: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        const headerValue = String(cell.value).trim();
        const normalized = normalizeHeader(headerValue);
        for (const [fieldName, variations] of Object.entries(headerMappings)) {
          if (columnMap[fieldName]) continue;
          if (variations.some((v) => normalized === v)) {
            columnMap[fieldName] = colNumber;
            break;
          }
          if (
            !columnMap[fieldName] &&
            variations.some(
              (v) => normalized.includes(v) || v.includes(normalized),
            )
          ) {
            columnMap[fieldName] = colNumber;
          }
        }
      }
    });

    const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
    if (missingColumns.length > 0) {
      return {
        rows: [],
        errors: [],
        missingColumns,
        foundColumns: Object.keys(columnMap),
      };
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
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(
            (err: { path: (string | number)[]; message: string }) => {
              const fieldValue = err.path.reduce(
                (obj: unknown, key: string | number) =>
                  (obj as Record<string, unknown>)?.[key as string],
                rowData,
              );
              errors.push({
                row: rowIndex,
                field: err.path.join("."),
                message: err.message,
                value: fieldValue,
              });
            },
          );
        } else {
          errors.push({
            row: rowIndex,
            message: (error as Error).message || "Invalid row data",
          });
        }
      }
    });
  }

  return { rows, errors };
}

export async function processMemberBulkUpload(
  tenantId: string,
  rows: ExcelMemberRow[],
  initialErrors: ValidationError[] = [],
): Promise<MemberBulkUploadResult> {
  const errors: ValidationError[] = [...initialErrors];
  const createdMembers: Array<{
    id: string;
    phone: string;
    name: string | null;
  }> = [];
  const skippedMembers: Array<{
    phone: string;
    name: string | null;
    reason: string;
  }> = [];

  for (const r of rows) {
    try {
      const normalizedPhone = r.phone.replace(/[\s-]/g, "").trim();

      if (r.id) {
        const existingById = await membersRepository.existsMemberById(
          r.id,
          tenantId,
        );
        if (existingById) {
          skippedMembers.push({
            phone: normalizedPhone,
            name: r.name,
            reason: `Member with ID "${r.id}" (member_id) already exists`,
          });
          continue;
        }
      }

      const existingByPhone = await membersRepository.findMemberByPhone(
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

      const member = await membersRepository.createMember({
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
      const message = (error as Error).message || "Error creating member";
      errors.push({ row: rows.indexOf(r) + 2, message });
      skippedMembers.push({
        phone: r.phone,
        name: r.name,
        reason: message,
      });
    }
  }

  return {
    created: createdMembers,
    skipped: skippedMembers,
    errors,
    summary: {
      total: rows.length,
      created: createdMembers.length,
      skipped: skippedMembers.length,
      errors: errors.length,
    },
  };
}
