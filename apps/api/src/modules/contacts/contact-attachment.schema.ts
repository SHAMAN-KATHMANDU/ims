import { z } from "zod";

export const CreateContactAttachmentSchema = z.object({
  storageKey: z.string().min(1).max(768),
  publicUrl: z.string().url().max(1024),
  fileName: z.string().min(1).max(255),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(200 * 1024 * 1024)
    .optional(),
  mimeType: z.string().min(1).max(120),
});

export type CreateContactAttachmentDto = z.infer<
  typeof CreateContactAttachmentSchema
>;
