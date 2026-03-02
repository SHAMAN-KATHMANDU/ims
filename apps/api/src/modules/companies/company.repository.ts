import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

export class CompanyRepository {
  async create(
    tenantId: string,
    data: {
      name: string;
      website: string | null;
      address: string | null;
      phone: string | null;
    },
  ) {
    return prisma.company.create({
      data: {
        tenantId,
        name: data.name,
        website: data.website,
        address: data.address,
        phone: data.phone,
      },
    });
  }

  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);

    const allowedSortFields = ["createdAt", "updatedAt", "name", "id"];
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) || {
      name: "asc",
    };

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [totalItems, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { contacts: true, deals: true } },
        },
      }),
    ]);

    return createPaginationResult(companies, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return prisma.company.findFirst({
      where: { id, tenantId },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: { select: { deals: true } },
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      website?: string | null;
      address?: string | null;
      phone?: string | null;
    },
  ) {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findForSelect(tenantId: string) {
    return prisma.company.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    });
  }
}

export default new CompanyRepository();
