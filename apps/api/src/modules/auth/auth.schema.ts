import { z } from "zod";

/**
 * JWT payload schema — validates decoded token claims at runtime.
 * Used by auth middleware to prevent arbitrary payload injection.
 */
export const JwtPayloadSchema = z.object({
  id: z.string().min(1, "Token missing user id"),
  role: z.enum(["platformAdmin", "superAdmin", "admin", "user"], {
    errorMap: () => ({ message: "Token has invalid role" }),
  }),
  tenantId: z.string().min(1, "Token missing tenant id"),
  tenantSlug: z.string().min(1, "Token missing tenant slug"),
  username: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

/**
 * Refresh-token payload. Carries only the user id and a `type` discriminator
 * so an access token can never be replayed at /auth/refresh and vice versa.
 */
export const RefreshTokenPayloadSchema = z.object({
  id: z.string().min(1, "Refresh token missing user id"),
  type: z.literal("refresh", {
    errorMap: () => ({ message: "Wrong token type for refresh" }),
  }),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export type RefreshTokenBodyDto = z.infer<typeof RefreshTokenBodySchema>;

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

export const ForgotPasswordSchema = z.object({
  username: z
    .string()
    .transform((s) => s?.toString().toLowerCase().trim() ?? "")
    .pipe(z.string().min(1, "Username is required")),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
