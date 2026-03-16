import { z } from "zod";

const VALID_ROLES = ["platformAdmin", "superAdmin", "admin", "user"] as const;

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(100)
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({
      message:
        "Invalid role. Must be platformAdmin, superAdmin, admin, or user",
    }),
  }),
});

export const UpdateUserSchema = z
  .object({
    username: z
      .string()
      .min(1)
      .max(100)
      .transform((val) => val.toLowerCase().trim())
      .optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    role: z
      .enum(VALID_ROLES, {
        errorMap: () => ({
          message:
            "Invalid role. Must be platformAdmin, superAdmin, admin, or user",
        }),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const ApprovePasswordResetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
export type ApprovePasswordResetDto = z.infer<
  typeof ApprovePasswordResetSchema
>;

/** Query for GET password reset requests (tenant or platform). When both absent, returns all. */
export const ListPasswordResetRequestsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? undefined : Math.max(1, parseInt(v) || 1),
    ),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? undefined
        : Math.min(100, Math.max(1, parseInt(v) || 10)),
    ),
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});
