/**
 * Members repository - database access for members module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const memberListInclude = {
  _count: {
    select: { sales: true },
  },
} as const;

const memberByIdWithSalesInclude = {
  sales: {
    orderBy: { createdAt: "desc" as const },
    include: {
      location: { select: { id: true, name: true } },
      items: {
        include: {
          variation: {
            include: {
              product: {
                select: { id: true, name: true, imsCode: true },
              },
            },
          },
        },
      },
    },
  },
  _count: { select: { sales: true } },
} as const;

export const membersRepository = {
  findMemberByPhone(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { tenantId, phone },
      include: memberListInclude,
    });
  },

  findMemberByPhoneLight(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { tenantId, phone },
      select: {
        id: true,
        phone: true,
        name: true,
        isActive: true,
      },
    });
  },

  findMemberById(id: string, tenantId?: string) {
    return prisma.member.findFirst({
      where: tenantId ? { id, tenantId } : { id },
      include: memberListInclude,
    });
  },

  findMemberByIdWithSales(id: string, tenantId: string) {
    return prisma.member.findFirst({
      where: { id, tenantId },
      include: memberByIdWithSalesInclude,
    });
  },

  findMemberByIdForUpdate(id: string, tenantId: string) {
    return prisma.member.findFirst({
      where: { id, tenantId },
    });
  },

  /** Check if a member exists by id within tenant (for bulk upload). */
  existsMemberById(id: string, tenantId: string) {
    return prisma.member.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  },

  findMembers(params: {
    where: Prisma.MemberWhereInput;
    orderBy: Prisma.MemberOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.member.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: memberListInclude,
    });
  },

  countMembers(where: Prisma.MemberWhereInput) {
    return prisma.member.count({ where });
  },

  createMember(data: Prisma.MemberUncheckedCreateInput) {
    return prisma.member.create({
      data,
    });
  },

  updateMember(id: string, data: Prisma.MemberUpdateInput) {
    return prisma.member.update({
      where: { id },
      data,
      include: memberListInclude,
    });
  },

  findMembersForExport(params: {
    where: Prisma.MemberWhereInput;
    orderBy: Prisma.MemberOrderByWithRelationInput;
  }) {
    return prisma.member.findMany({
      where: params.where,
      orderBy: params.orderBy,
      include: {
        _count: { select: { sales: true } },
      },
    });
  },
};
