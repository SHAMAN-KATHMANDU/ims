import prisma from "@/config/prisma";
import { MetaCredentialKind, ChannelStatus, Prisma } from "@prisma/client";

export class MetaIntegrationRepository {
  /** The tenant's integration row with its credentials (or null if never configured). */
  async getIntegration(tenantId: string) {
    return prisma.metaIntegration.findUnique({
      where: { tenantId },
      include: { credentials: { orderBy: { createdAt: "asc" } } },
    });
  }

  /** Create the integration row on first use, or return the existing one. */
  async ensureIntegration(tenantId: string) {
    const existing = await prisma.metaIntegration.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;
    return prisma.metaIntegration.create({ data: { tenantId } });
  }

  async upsertIntegration(
    tenantId: string,
    data: {
      appId?: string | null;
      appSecretEnc?: string | null;
      graphApiVersion?: string | null;
      defaultPageId?: string | null;
      defaultAdAccountId?: string | null;
    },
  ) {
    return prisma.metaIntegration.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  async getCredentials(tenantId: string) {
    return prisma.metaCredential.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  async getCredentialsByKind(tenantId: string, kind: MetaCredentialKind) {
    return prisma.metaCredential.findMany({
      where: { tenantId, kind, status: ChannelStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    });
  }

  async getCredentialById(tenantId: string, id: string) {
    return prisma.metaCredential.findFirst({ where: { id, tenantId } });
  }

  async upsertCredential(data: {
    tenantId: string;
    integrationId: string;
    kind: MetaCredentialKind;
    externalId: string;
    name: string;
    accessTokenEnc: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const { tenantId, kind, externalId, ...rest } = data;
    return prisma.metaCredential.upsert({
      where: {
        tenantId_kind_externalId: { tenantId, kind, externalId },
      },
      create: { tenantId, kind, externalId, ...rest },
      update: {
        name: rest.name,
        accessTokenEnc: rest.accessTokenEnc,
        metadata: rest.metadata,
        status: ChannelStatus.ACTIVE,
      },
    });
  }

  async deleteCredential(tenantId: string, id: string) {
    // Scope the delete to the tenant so one tenant can't remove another's row.
    const result = await prisma.metaCredential.deleteMany({
      where: { id, tenantId },
    });
    return result.count > 0;
  }
}

export default new MetaIntegrationRepository();
