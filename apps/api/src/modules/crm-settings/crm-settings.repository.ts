import prisma from "@/config/prisma";
import type {
  CreateCrmSourceDto,
  UpdateCrmSourceDto,
  CreateCrmJourneyTypeDto,
  UpdateCrmJourneyTypeDto,
} from "./crm-settings.schema";

export class CrmSettingsRepository {
  // ── Sources ──────────────────────────────────────────────────────────────

  async countSources(tenantId: string, search?: string) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.crmSource.count({ where });
  }

  async findAllSources(tenantId: string) {
    return prisma.crmSource.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findAllSourcesPaginated(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.crmSource.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
      skip,
      take,
    });
  }

  async findSourceById(tenantId: string, id: string) {
    return prisma.crmSource.findFirst({ where: { id, tenantId } });
  }

  async findSourceByName(tenantId: string, name: string) {
    return prisma.crmSource.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
  }

  async createSource(tenantId: string, data: CreateCrmSourceDto) {
    return prisma.crmSource.create({
      data: { tenantId, name: data.name.trim() },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async updateSource(id: string, data: UpdateCrmSourceDto) {
    return prisma.crmSource.update({
      where: { id },
      data: { name: data.name.trim() },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async deleteSource(id: string) {
    return prisma.crmSource.delete({ where: { id } });
  }

  // ── Journey Types ─────────────────────────────────────────────────────────

  async countJourneyTypes(tenantId: string, search?: string) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.crmJourneyType.count({ where });
  }

  async findAllJourneyTypes(tenantId: string) {
    return prisma.crmJourneyType.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findAllJourneyTypesPaginated(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.crmJourneyType.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
      skip,
      take,
    });
  }

  async findJourneyTypeById(tenantId: string, id: string) {
    return prisma.crmJourneyType.findFirst({ where: { id, tenantId } });
  }

  async findJourneyTypeByName(tenantId: string, name: string) {
    return prisma.crmJourneyType.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
  }

  async createJourneyType(tenantId: string, data: CreateCrmJourneyTypeDto) {
    return prisma.crmJourneyType.create({
      data: { tenantId, name: data.name.trim() },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async updateJourneyType(id: string, data: UpdateCrmJourneyTypeDto) {
    return prisma.crmJourneyType.update({
      where: { id },
      data: { name: data.name.trim() },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async deleteJourneyType(id: string) {
    return prisma.crmJourneyType.delete({ where: { id } });
  }
}

export default new CrmSettingsRepository();
