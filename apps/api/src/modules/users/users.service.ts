/**
 * Users service - business logic for users module.
 */

import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { NotFoundError, DomainError, AppError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { usersRepository } from "./users.repository";

const ALLOWED_SORT_FIELDS = [
  "id",
  "username",
  "role",
  "createdAt",
  "updatedAt",
];

export type CreateUserInput = {
  username: string;
  password: string;
  role: string;
};

export type UpdateUserInput = {
  username?: string;
  password?: string;
  role?: string;
};

export type UserListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const usersService = {
  async create(tenantId: string, input: CreateUserInput) {
    const normalizedUsername = input.username.toLowerCase().trim();
    const existing = await usersRepository.findUserByUsername(
      tenantId,
      normalizedUsername,
    );
    if (existing) {
      throw new AppError("User with this username already exists", 409);
    }
    const hashedPassword = await bcrypt.hash(input.password, 10);
    return usersRepository.createUser({
      tenantId,
      username: normalizedUsername,
      password: hashedPassword,
      role: input.role,
    });
  },

  async getAll(tenantId: string, query: UserListQuery) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);

    const orderBy =
      getPrismaOrderBy(sortBy, sortOrder, ALLOWED_SORT_FIELDS) ??
      ({ createdAt: "desc" as const } as Prisma.UserOrderByWithRelationInput);

    const where: Prisma.UserWhereInput = { tenantId };
    if (search) {
      where.username = { contains: search, mode: "insensitive" };
    }

    const skip = (page - 1) * limit;
    const [totalItems, users] = await Promise.all([
      usersRepository.countUsers(where),
      usersRepository.findUsers({ where, orderBy, skip, take: limit }),
    ]);

    const result = createPaginationResult(users, totalItems, page, limit);
    return { data: result.data, pagination: result.pagination };
  },

  async getById(id: string, tenantId: string) {
    const user = await usersRepository.findUserById(id, tenantId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },

  async update(id: string, tenantId: string, input: UpdateUserInput) {
    const existing = await usersRepository.findUserByIdWithPassword(
      id,
      tenantId,
    );
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (input.username !== undefined) {
      const normalizedUsername = input.username.toLowerCase().trim();
      const usernameExists = await usersRepository.findUserByUsername(
        tenantId,
        normalizedUsername,
      );
      if (usernameExists && usernameExists.id !== id) {
        throw new AppError("Username already taken", 409);
      }
      updateData.username = normalizedUsername;
    }

    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    if (input.role !== undefined) {
      updateData.role = input.role as any;
    }

    return usersRepository.updateUser(id, updateData);
  },

  async delete(id: string, tenantId: string, currentUserId: string) {
    const existing = await usersRepository.findUserById(id, tenantId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }
    if (id === currentUserId) {
      throw new DomainError(400, "You cannot delete your own account");
    }
    await usersRepository.deleteUser(id);
  },
};
