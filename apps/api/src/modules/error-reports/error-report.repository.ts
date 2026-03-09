import prisma from "@/config/prisma";

export interface ErrorReportWhere {
  tenantId?: string | null;
  userId?: string;
  status?: "OPEN" | "REVIEWED" | "RESOLVED";
  createdAt?: { gte?: Date; lte?: Date };
}

export interface CreateErrorReportData {
  tenantId: string | null;
  userId: string;
  title: string;
  description: string | null;
  pageUrl: string | null;
}

const userSelect = { select: { id: true, username: true } };

export class ErrorReportRepository {
  async create(data: CreateErrorReportData) {
    return prisma.errorReport.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        title: data.title,
        description: data.description,
        pageUrl: data.pageUrl,
      },
      include: { user: userSelect },
    });
  }

  async count(where: ErrorReportWhere) {
    return prisma.errorReport.count({ where });
  }

  async findMany(where: ErrorReportWhere, skip: number, take: number) {
    return prisma.errorReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: userSelect },
    });
  }

  async updateStatus(id: string, status: "OPEN" | "REVIEWED" | "RESOLVED") {
    return prisma.errorReport.update({
      where: { id },
      data: { status },
      include: { user: userSelect },
    });
  }
}

export default new ErrorReportRepository();
