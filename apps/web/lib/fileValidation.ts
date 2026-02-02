/**
 * Single place for bulk-upload file rules.
 * Changing max size or allowed types must happen here only.
 */

/** Max size for bulk upload files (10MB). */
export const BULK_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for Excel bulk upload. */
export const ALLOWED_EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
] as const;

/** Allowed file extensions for Excel bulk upload. */
export const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls", ".xlsm"] as const;

/**
 * Validates file for bulk upload (type and size). Throws if invalid.
 */
export function validateExcelFile(file: File): void {
  if (!file) {
    throw new Error("File is required");
  }

  const fileExtension = file.name
    .substring(file.name.lastIndexOf("."))
    .toLowerCase();

  const validMime = (ALLOWED_EXCEL_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  const validExt = (ALLOWED_EXCEL_EXTENSIONS as readonly string[]).includes(
    fileExtension,
  );
  if (!validMime && !validExt) {
    throw new Error(
      "Invalid file type. Only Excel files (.xlsx, .xls, .xlsm) are allowed.",
    );
  }

  if (file.size > BULK_UPLOAD_MAX_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }
}
