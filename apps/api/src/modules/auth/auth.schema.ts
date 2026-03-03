import { z } from "zod";

export const LoginSchema = z.object({
  username: z
    .string()
    .transform((s) => s?.toString().toLowerCase().trim() ?? "")
    .pipe(z.string().min(1, "Username is required")),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "user"]).default("user"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
