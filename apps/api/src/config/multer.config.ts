import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `bulk-upload-${uniqueSuffix}${ext}`);
  },
});

// File filter - allow Excel and CSV files
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    "text/csv", // .csv
    "application/csv", // .csv (alternative MIME type)
    "text/plain", // .csv (some systems send CSV as text/plain)
  ];

  const allowedExts = [".xlsx", ".xls", ".xlsm", ".csv"];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExt = allowedExts.includes(ext);

  if (isValidMime || isValidExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only Excel files (.xlsx, .xls, .xlsm) and CSV files (.csv) are allowed.",
      ),
    );
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single("file");

// Attachment storage - store in uploads/attachments subfolder
const attachmentsDir = path.join(uploadsDir, "attachments");
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Attachment file filter - allow common document and image types
const attachmentFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExts = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".doc",
    ".docx",
  ];
  const ext = path.extname(file.originalname || "").toLowerCase();
  const isValid =
    allowedMimes.includes(file.mimetype) || allowedExts.includes(ext);
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: PDF, images, Word documents."));
  }
};

export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  fileFilter: attachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("file");
