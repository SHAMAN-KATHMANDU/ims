/**
 * Users repository - database access for users module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const userListSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const usersRepository = {
  findUserByUsername(tenantId: string, username: string) {
    return prisma.user.findFirst({
      where: { tenantId, username },
    });
  },

  findUsers(params: {
    where: Prisma.UserWhereInput;
    orderBy: Prisma.UserOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.user.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      select: userListSelect,
    });
  },

  countUsers(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  findUserById(id: string, tenantId: string) {
    return prisma.user.findFirst({
      where: { id, tenantId },
      select: userListSelect,
    });
  },

  findUserByIdWithPassword(id: string, tenantId: string) {
    return prisma.user.findFirst({
      where: { id, tenantId },
    });
  },

  createUser(data: {
    tenantId: string;
    username: string;
    password: string;
    role: string;
  }) {
    return prisma.user.create({
      data: {
        tenantId: data.tenantId,
        username: data.username,
        password: data.password,
        role: data.role as any,
      },
      select: userListSelect,
    });
  },

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: userListSelect,
    });
  },

  deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};
