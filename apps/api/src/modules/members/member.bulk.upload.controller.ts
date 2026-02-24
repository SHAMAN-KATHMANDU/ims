/**
 * Member bulk upload controller — parse file and process bulk upload.
 */
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { ok, fail } from "@/shared/response";
import {
  parseMemberFile,
  processMemberBulkUpload,
} from "./members.bulkUpload.service";

export async function bulkUploadMembers(req: Request, res: Response) {
  const auth = req.authContext!;

  try {
    if (!req.file) {
      return fail(res, "No file uploaded", 400, undefined, {
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        created: [],
        skipped: [],
        errors: [],
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isCSV = fileExt === ".csv";

    const parseResult = await parseMemberFile(filePath, isCSV);

    if (parseResult.missingColumns && parseResult.missingColumns.length > 0) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      return fail(
        res,
        "Missing required columns in CSV/Excel file",
        400,
        undefined,
        {
          missingColumns: parseResult.missingColumns,
          foundColumns: parseResult.foundColumns,
          hint: "Required: Phone number. Optional: SN, ID (maps to member_id; must be valid UUID), Name, Address, DoB, Notes, Member since.",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          created: [],
          skipped: [],
          errors: [],
        },
      );
    }

    if (parseResult.rows.length === 0) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      return fail(res, "File is empty or no valid rows", 400, undefined, {
        summary: {
          total: 0,
          created: 0,
          skipped: 0,
          errors: parseResult.errors.length,
        },
        created: [],
        skipped: [],
        errors: parseResult.errors,
      });
    }

    const result = await processMemberBulkUpload(
      auth.tenantId,
      parseResult.rows,
      parseResult.errors,
    );

    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }

    return ok(
      res,
      {
        message: "Bulk upload completed",
        summary: result.summary,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      },
      200,
      "Bulk upload completed",
    );
  } catch (error: unknown) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }
    throw error;
  }
}
