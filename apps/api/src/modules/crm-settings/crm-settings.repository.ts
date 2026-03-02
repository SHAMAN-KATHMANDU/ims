import prisma from "@/config/prisma";
import type {
  CreateCrmSourceDto,
  UpdateCrmSourceDto,
  CreateCrmJourneyTypeDto,
  UpdateCrmJourneyTypeDto,
} from "./crm-settings.schema";

export class CrmSettingsRepository {
  // ── Sources ──────────────────────────────────────────────────────────────

  async findAllSources(tenantId: string) {
    return prisma.crmSource.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
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

  async findAllJourneyTypes(tenantId: string) {
    return prisma.crmJourneyType.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
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
