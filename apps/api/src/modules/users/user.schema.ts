import { z } from "zod";

const roleSchema = z.enum(["superAdmin", "admin", "user"]);

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: roleSchema,
});

export const updateUserSchema = z.object({
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
  role: roleSchema.optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, "User ID is required"),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["id", "username", "role", "createdAt", "updatedAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
