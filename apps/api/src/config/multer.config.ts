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

const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    const safeName = (file.originalname || "file")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .slice(0, 50);
    cb(null, `contact-${uniqueSuffix}-${safeName}${ext}`);
  },
});

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
  storage: attachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("file");

// --- Messaging media (images + videos) → uploads/messaging/ ---
const messagingMediaDir = path.join(uploadsDir, "messaging");
if (!fs.existsSync(messagingMediaDir)) {
  fs.mkdirSync(messagingMediaDir, { recursive: true });
}

const messagingMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, messagingMediaDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt =
      ext && ext.length <= 8 && /^\.[a-z0-9.]+$/i.test(ext) ? ext : "";
    cb(null, `msg-${uniqueSuffix}${safeExt}`);
  },
});

const messagingMediaFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];
  const allowedExts = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".mp4",
    ".webm",
    ".mov",
  ];
  const ext = path.extname(file.originalname || "").toLowerCase();
  const ok =
    allowedMimes.includes(file.mimetype) || allowedExts.includes(ext);
  if (ok) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV.",
      ),
    );
  }
};

export const uploadMessagingMedia = multer({
  storage: messagingMediaStorage,
  fileFilter: messagingMediaFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
}).single("file");
