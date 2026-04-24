import { z } from "zod";

/**
 * Shared role form schema — covers both create and update. The `permissions`
 * field is the base64-encoded 64-byte bitset.
 */
export const RoleEditorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  priority: z
    .number({ invalid_type_error: "Priority must be a number" })
    .int("Priority must be a whole number")
    .min(0, "Priority must be 0 or greater")
    .max(10000, "Priority capped at 10000"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a #RRGGBB hex code")
    .nullable(),
  permissions: z
    .string()
    .min(1, "Permissions bitset is required")
    .max(2048, "Invalid permissions bitset"),
});

export type RoleEditorInput = z.infer<typeof RoleEditorSchema>;
