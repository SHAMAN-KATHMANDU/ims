/**
 * Product bulk upload controller — parse file and process bulk upload.
 */
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { logger } from "@/config/logger";
import { ok, fail } from "@/shared/response";
import { parseProductFile, processBulkUpload } from "./bulkUpload.service";

export async function bulkUploadProducts(req: Request, res: Response) {
  const auth = req.authContext!;

  try {
    if (!req.file) {
      return fail(res, "No file uploaded", 400, undefined, { errors: [] });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isCSV = fileExt === ".csv";

    const parseResult = await parseProductFile(filePath, isCSV);

    if (parseResult.missingColumns && parseResult.missingColumns.length > 0) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      return fail(
        res,
        isCSV
          ? "Missing required columns in CSV file"
          : "Missing required columns in Excel file",
        400,
        undefined,
        {
          missingColumns: parseResult.missingColumns,
          foundColumns: parseResult.foundColumns,
          hint: "Please ensure your file has headers: IMS Code, Location, Category, Name of Product, Variations(Designs/Colors), Cost Price, Final SP",
        },
      );
    }

    if (parseResult.rows.length === 0) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      return fail(
        res,
        isCSV
          ? "CSV file is empty or invalid"
          : "Excel file must contain at least one worksheet",
        400,
        undefined,
        { errors: parseResult.errors },
      );
    }

    const result = await processBulkUpload({
      tenantId: auth.tenantId,
      userId: auth.userId,
      rows: parseResult.rows,
    });

    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      logger.error(
        "Error cleaning up file",
        (req as Request & { requestId?: string }).requestId,
        cleanupError,
      );
    }

    return ok(
      res,
      {
        summary: result.summary,
        created: result.created,
        updated: result.updated,
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
      } catch (cleanupError) {
        logger.error(
          "Error cleaning up file",
          (req as Request & { requestId?: string }).requestId,
          cleanupError,
        );
      }
    }
    throw error;
  }
}
