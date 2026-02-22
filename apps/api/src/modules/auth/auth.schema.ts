import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1).optional(),
});

export const consentSchema = z.object({
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
});

export const deletionRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type LogoutSchema = z.infer<typeof logoutSchema>;
export type ConsentSchema = z.infer<typeof consentSchema>;
export type DeletionRequestSchema = z.infer<typeof deletionRequestSchema>;
