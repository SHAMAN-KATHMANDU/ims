import prisma from "@/config/prisma";
import { type Role } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateUserDto } from "./user.schema";

const ALLOWED_SORT_FIELDS = [
  "id",
  "username",
  "role",
  "createdAt",
  "updatedAt",
];

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findFirst({ where: { username, deletedAt: null } });
  }

  async findByUsernameExcluding(username: string, excludeId: string) {
    return prisma.user.findFirst({
      where: { username, id: { not: excludeId }, deletedAt: null },
    });
  }

  async create(
    tenantId: string,
    data: CreateUserDto & { hashedPassword: string },
  ) {
    return prisma.user.create({
      data: {
        tenantId,
        username: data.username,
        password: data.hashedPassword,
        role: data.role,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findAll(
    query: ReturnType<typeof getPaginationParams> & { role?: Role },
  ) {
    const { page, limit, sortBy, sortOrder, search, role } = query;

    const orderBy = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_SORT_FIELDS,
    ) ?? {
      createdAt: "desc" as const,
    };

    const where: Parameters<typeof prisma.user.findMany>[0]["where"] = {
      // Hide soft-deleted (archived) users from the admin list — issue #537.
      deletedAt: null,
    };

    if (search) {
      where.OR = [{ username: { contains: search, mode: "insensitive" } }];
    }

    if (role) {
      where.role = role;
    }

    const skip = (page - 1) * limit;

    const [totalItems, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_PUBLIC_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return createPaginationResult(users, totalItems, page, limit);
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findByIdRaw(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async update(
    id: string,
    data: { username?: string; password?: string; role?: Role },
  ) {
    return prisma.user.update({
      where: { id },
      data,
      select: USER_PUBLIC_SELECT,
    });
  }

  /**
   * Soft-delete (archive) a user — issue #537. Hard-deleting fails because
   * onDelete: Restrict relations point at this user from contacts, deals,
   * leads, tasks, etc.; archiving keeps those references intact while the
   * row disappears from the admin list and from login lookups.
   */
  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: USER_PUBLIC_SELECT,
    });
  }
}

export default new UserRepository();
