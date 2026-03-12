import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const SlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Enter your organization slug")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use only letters, numbers, and hyphens (e.g. your-org)",
    ),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SlugInput = z.infer<typeof SlugSchema>;
