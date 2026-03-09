import { z } from "zod";

/** Tenant-level roles (excludes platformAdmin which is system-level) */
export const TENANT_ROLES = ["user", "admin", "superAdmin"] as const;

export const CreateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(TENANT_ROLES, {
    required_error: "Role is required",
  }),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Password must be at least 6 characters",
    }),
  role: z.enum(TENANT_ROLES, {
    required_error: "Role is required",
  }),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFormValues = z.infer<typeof UpdateUserSchema>;
