import { z } from "zod";

export const CrmReportsQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? parseInt(v, 10) || new Date().getFullYear()
        : new Date().getFullYear(),
    ),
});

export type CrmReportsQuery = z.infer<typeof CrmReportsQuerySchema>;
