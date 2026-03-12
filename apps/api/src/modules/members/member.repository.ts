import prisma from "@/config/prisma";

/** Data for creating a member (repository layer). */
export interface CreateMemberRepoData {
  tenantId: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  notes?: string | null;
  id?: string;
  address?: string | null;
  birthday?: Date | null;
  memberSince?: Date | null;
}

/** Data for updating a member (repository layer). */
export interface UpdateMemberRepoData {
  phone?: string;
  name?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

/** Where clause for member queries (tenant-scoped, non-deleted by default). */
export interface MemberWhere {
  tenantId: string;
  deletedAt?: Date | null;
  id?: string | { in: string[] };
  OR?: Array<{
    phone?: { contains: string; mode: "insensitive" };
    name?: { contains: string; mode: "insensitive" };
    email?: { contains: string; mode: "insensitive" };
  }>;
}

/** Order by for member list. */
export type MemberOrderBy = Record<string, "asc" | "desc">;

const memberIncludeWithCount = {
  _count: { select: { sales: true } },
} as const;

const memberIncludeWithSales = {
  sales: {
    orderBy: { createdAt: "desc" as const },
    include: {
      location: { select: { id: true, name: true } },
      items: {
        include: {
          variation: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  _count: { select: { sales: true } },
} as const;

const memberSelectCheck = {
  id: true,
  phone: true,
  name: true,
  isActive: true,
} as const;

export class MemberRepository {
  async create(data: CreateMemberRepoData) {
    const { id, tenantId, ...rest } = data;
    return prisma.member.create({
      data: {
        tenantId,
        ...(id && { id }),
        phone: rest.phone,
        name: rest.name ?? null,
        email: rest.email ?? null,
        notes: rest.notes ?? null,
        address: rest.address ?? null,
        birthday: rest.birthday ?? undefined,
        memberSince: rest.memberSince ?? undefined,
      },
    });
  }

  async count(where: MemberWhere): Promise<number> {
    return prisma.member.count({ where });
  }

  async findAll(
    where: MemberWhere,
    orderBy: MemberOrderBy,
    skip: number,
    take: number,
  ) {
    const [totalItems, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        orderBy,
        skip,
        take,
        include: memberIncludeWithCount,
      }),
    ]);
    return { members, totalItems };
  }

  async findByPhone(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { phone, tenantId, deletedAt: null },
      include: memberIncludeWithCount,
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.member.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findByIdWithSales(tenantId: string, id: string) {
    return prisma.member.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: memberIncludeWithSales,
    });
  }

  async update(id: string, data: UpdateMemberRepoData, includeCount = true) {
    return prisma.member.update({
      where: { id },
      data,
      include: includeCount ? memberIncludeWithCount : undefined,
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.member.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  /** Minimal select for check-member (sales lookup). */
  async checkMember(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { phone, tenantId, deletedAt: null },
      select: memberSelectCheck,
    });
  }

  /** Check if member exists by ID (for bulk upload). */
  async findExistingById(tenantId: string, id: string) {
    return prisma.member.findFirst({
      where: { id, tenantId },
    });
  }

  /** Check if member exists by phone (for create/bulk duplicate check). */
  async findExistingByPhone(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { phone, tenantId },
    });
  }

  /** Find or create member by phone (for sale flow — auto-create when adding phone). */
  async findOrCreateByPhone(
    tenantId: string,
    phone: string,
    name?: string | null,
  ) {
    const existing = await prisma.member.findFirst({
      where: { tenantId, phone, deletedAt: null },
    });
    if (existing) return existing;
    return prisma.member.create({
      data: {
        tenantId,
        phone,
        name: name ?? null,
      },
    });
  }

  /** Find members for download/export (filter by ids or all). */
  async findForExport(tenantId: string, memberIds?: string[]) {
    const where: MemberWhere = { tenantId, deletedAt: null };
    if (memberIds && memberIds.length > 0) {
      where.id = { in: memberIds };
    }
    return prisma.member.findMany({
      where,
      include: memberIncludeWithCount,
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new MemberRepository();
