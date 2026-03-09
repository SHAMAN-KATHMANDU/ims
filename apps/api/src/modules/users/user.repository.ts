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
    return prisma.user.findFirst({ where: { username } });
  }

  async findByUsernameExcluding(username: string, excludeId: string) {
    return prisma.user.findFirst({
      where: { username, id: { not: excludeId } },
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

  async findAll(query: ReturnType<typeof getPaginationParams>) {
    const { page, limit, sortBy, sortOrder, search } = query;

    const orderBy = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_SORT_FIELDS,
    ) ?? {
      createdAt: "desc" as const,
    };

    const where: Parameters<typeof prisma.user.findMany>[0]["where"] = {};

    if (search) {
      where.OR = [{ username: { contains: search, mode: "insensitive" } }];
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
    return prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findByIdRaw(id: string) {
    return prisma.user.findUnique({ where: { id } });
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

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export default new UserRepository();
