export const MEDIA_PURPOSE_MAX_BYTES: Record<
  "product_photo" | "contact_attachment" | "library",
  number
> = {
  product_photo: 12 * 1024 * 1024,
  contact_attachment: 30 * 1024 * 1024,
  library: 30 * 1024 * 1024,
};

/** Bytes to read from S3 for optional magic-byte verification (file-type). */
export const MEDIA_SNIFF_MAX_BYTES = 64 * 1024;
