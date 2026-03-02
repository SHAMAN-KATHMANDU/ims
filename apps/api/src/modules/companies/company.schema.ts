import { z } from "zod";

export const CreateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255).trim(),
  website: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v?.trim() || undefined),
  address: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  phone: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export const UpdateCompanySchema = z.object({
  name: z
    .string()
    .max(255)
    .optional()
    .transform((v) => (v != null && v.trim() ? v.trim() : undefined)),
  website: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) =>
      v === undefined
        ? undefined
        : v === null || v === ""
          ? null
          : (v as string).trim(),
    ),
  address: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) =>
      v === undefined
        ? undefined
        : v === null || v === ""
          ? null
          : (v as string).trim(),
    ),
  phone: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v === null || v === "" ? null : v,
    ),
});

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
