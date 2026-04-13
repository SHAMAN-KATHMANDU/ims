/**
 * Platform domain service — validates tenant existence, generates verify
 * tokens, performs DNS TXT verification.
 */

import { randomBytes } from "node:crypto";
import { resolveTxt as nodeResolveTxt } from "node:dns/promises";
import type { TenantDomain, TenantDomainApp } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import platformWebsitesService from "@/modules/platform-websites/platform-websites.service";
import defaultRepo from "./platform-domains.repository";
import type {
  CreateTenantDomainInput,
  UpdateTenantDomainInput,
} from "./platform-domains.schema";

type Repo = typeof defaultRepo;
type ResolveTxt = (name: string) => Promise<string[][]>;
type AssertWebsiteEnabled = (tenantId: string) => Promise<void>;

const VERIFY_TXT_PREFIX = "shaman-verify=";

function newVerifyToken(): string {
  return randomBytes(18).toString("hex");
}

export class PlatformDomainsService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly resolveTxt: ResolveTxt = nodeResolveTxt,
    private readonly assertWebsiteEnabled: AssertWebsiteEnabled = (id) =>
      platformWebsitesService.assertWebsiteEnabled(id),
  ) {}

  async listTenantDomains(
    tenantId: string,
    appType?: TenantDomainApp,
  ): Promise<TenantDomain[]> {
    const tenant = await this.repo.tenantExists(tenantId);
    if (!tenant) throw createError("Tenant not found", 404);
    return this.repo.listByTenant(tenantId, appType);
  }

  async addDomain(
    tenantId: string,
    input: CreateTenantDomainInput,
  ): Promise<TenantDomain> {
    const tenant = await this.repo.tenantExists(tenantId);
    if (!tenant) throw createError("Tenant not found", 404);

    // WEBSITE-typed domains require the website feature to be enabled for
    // the tenant. IMS/API domains are always allowed because the IMS itself
    // is always available to every tenant.
    if (input.appType === "WEBSITE") {
      await this.assertWebsiteEnabled(tenantId);
    }

    const existing = await this.repo.findByHostname(input.hostname);
    if (existing) throw createError("Hostname already registered", 409);

    const domain = await this.repo.create({
      tenantId,
      hostname: input.hostname,
      appType: input.appType,
      isPrimary: input.isPrimary ?? false,
      verifyToken: newVerifyToken(),
    });

    if (domain.isPrimary) {
      await this.repo.clearOtherPrimaries(tenantId, domain.appType, domain.id);
    }
    return domain;
  }

  async updateDomain(
    id: string,
    input: UpdateTenantDomainInput,
  ): Promise<TenantDomain> {
    const current = await this.repo.findById(id);
    if (!current) throw createError("Domain not found", 404);

    const updated = await this.repo.update(id, {
      ...(input.appType ? { appType: input.appType } : {}),
      ...(typeof input.isPrimary === "boolean"
        ? { isPrimary: input.isPrimary }
        : {}),
    });

    if (updated.isPrimary) {
      await this.repo.clearOtherPrimaries(
        updated.tenantId,
        updated.appType,
        updated.id,
      );
    }
    return updated;
  }

  async deleteDomain(id: string): Promise<void> {
    const current = await this.repo.findById(id);
    if (!current) throw createError("Domain not found", 404);
    await this.repo.delete(id);
  }

  /**
   * Fetch DNS-verification instructions for a domain. Customers place a TXT
   * record at `_shaman.<hostname>` containing `shaman-verify=<token>`.
   */
  async getVerificationInstructions(id: string): Promise<{
    hostname: string;
    txtName: string;
    txtValue: string;
    verifiedAt: Date | null;
  }> {
    const domain = await this.repo.findById(id);
    if (!domain) throw createError("Domain not found", 404);
    return {
      hostname: domain.hostname,
      txtName: `_shaman.${domain.hostname}`,
      txtValue: `${VERIFY_TXT_PREFIX}${domain.verifyToken}`,
      verifiedAt: domain.verifiedAt,
    };
  }

  async verifyDomain(id: string): Promise<TenantDomain> {
    const domain = await this.repo.findById(id);
    if (!domain) throw createError("Domain not found", 404);

    const expected = `${VERIFY_TXT_PREFIX}${domain.verifyToken}`;
    const txtName = `_shaman.${domain.hostname}`;

    let records: string[][];
    try {
      records = await this.resolveTxt(txtName);
    } catch {
      throw createError(
        `No TXT record found at ${txtName}. Add the verification TXT record and retry.`,
        400,
      );
    }

    const flat = records.map((chunks) => chunks.join(""));
    if (!flat.includes(expected)) {
      throw createError(
        `TXT record at ${txtName} did not contain the expected verification value.`,
        400,
      );
    }

    return this.repo.update(id, { verifiedAt: new Date() });
  }
}

export default new PlatformDomainsService();
