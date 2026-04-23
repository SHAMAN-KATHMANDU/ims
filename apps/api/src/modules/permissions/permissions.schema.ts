import { z } from "zod";

/**
 * Zod schemas for the permissions API.
 * Bitsets are transmitted as base64 strings per RBAC_CONTRACT.md §4.
 */

// ============ Role Management ============

export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(255, "Role name must be less than 255 characters"),
  priority: z
    .number()
    .int("Priority must be an integer")
    .min(1, "Priority must be at least 1"),
  permissions: z
    .string()
    .regex(
      /^[A-Za-z0-9+/]*={0,2}$/,
      "Permissions must be a valid base64 string",
    ),
  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      "Color must be a valid hex color code (e.g., #FF0000)",
    )
    .optional(),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Role name is required")
      .max(255, "Role name must be less than 255 characters")
      .optional(),
    priority: z
      .number()
      .int("Priority must be an integer")
      .min(1, "Priority must be at least 1")
      .optional(),
    permissions: z
      .string()
      .regex(
        /^[A-Za-z0-9+/]*={0,2}$/,
        "Permissions must be a valid base64 string",
      )
      .optional(),
    color: z
      .string()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        "Color must be a valid hex color code (e.g., #FF0000)",
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

export const ListRolesQuerySchema = z.object({
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

export type ListRolesQueryDto = z.infer<typeof ListRolesQuerySchema>;

// ============ Role Member Management ============

export const AssignUserToRoleSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
});

export type AssignUserToRoleDto = z.infer<typeof AssignUserToRoleSchema>;

// ============ Permission Overwrites ============

export const SubjectTypeEnum = z.enum(["USER", "ROLE"]);
export type SubjectType = z.infer<typeof SubjectTypeEnum>;

export const UpsertPermissionOverwriteSchema = z
  .object({
    subjectType: SubjectTypeEnum,
    roleId: z.string().uuid("Role ID must be a valid UUID").optional(),
    userId: z.string().uuid("User ID must be a valid UUID").optional(),
    allow: z
      .string()
      .regex(
        /^[A-Za-z0-9+/]*={0,2}$/,
        "Allow bitset must be a valid base64 string",
      )
      .optional(),
    deny: z
      .string()
      .regex(
        /^[A-Za-z0-9+/]*={0,2}$/,
        "Deny bitset must be a valid base64 string",
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.subjectType === "ROLE") return !!data.roleId;
      if (data.subjectType === "USER") return !!data.userId;
      return false;
    },
    {
      message:
        "roleId required for ROLE subject type, userId required for USER subject type",
    },
  );

export type UpsertPermissionOverwriteDto = z.infer<
  typeof UpsertPermissionOverwriteSchema
>;

// ============ Effective Permissions ============

export const GetEffectivePermissionsQuerySchema = z.object({
  resourceId: z.string().uuid("Resource ID must be a valid UUID"),
});

export type GetEffectivePermissionsQueryDto = z.infer<
  typeof GetEffectivePermissionsQuerySchema
>;

export const BulkResolvePermissionsSchema = z.object({
  resourceIds: z
    .array(z.string().uuid("Each resource ID must be a valid UUID"))
    .min(1, "At least one resource ID is required"),
});

export type BulkResolvePermissionsDto = z.infer<
  typeof BulkResolvePermissionsSchema
>;
