/**
 * Map file extension → MIME for tenant media uploads (aligned with API key naming).
 */
const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function extname(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, "");
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

export function inferMimeFromFileName(
  fileName: string | undefined,
): string | null {
  if (!fileName?.trim()) return null;
  const ext = extname(fileName.trim());
  return EXT_TO_MIME[ext] ?? null;
}
