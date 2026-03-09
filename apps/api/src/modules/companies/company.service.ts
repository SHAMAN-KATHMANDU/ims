import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { normalizePhoneOptional } from "@/utils/phone";
import companyRepository from "./company.repository";
import type { CreateCompanyDto, UpdateCompanyDto } from "./company.schema";

export class CompanyService {
  async create(tenantId: string, data: CreateCompanyDto) {
    let phoneNormalized: string | null = null;
    if (data.phone && data.phone.trim()) {
      try {
        phoneNormalized = normalizePhoneOptional(data.phone);
      } catch (err: unknown) {
        throw createError(
          err instanceof Error ? err.message : "Invalid phone number",
          400,
        );
      }
    }

    return companyRepository.create(tenantId, {
      name: data.name,
      website: data.website ?? null,
      address: data.address ?? null,
      phone: phoneNormalized,
    });
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return companyRepository.findAll(tenantId, query);
  }

  async getById(tenantId: string, id: string) {
    const company = await companyRepository.findById(tenantId, id);
    if (!company) throw createError("Company not found", 404);
    return company;
  }

  async update(tenantId: string, id: string, data: UpdateCompanyDto) {
    const existing = await companyRepository.findById(tenantId, id);
    if (!existing) throw createError("Company not found", 404);

    let phoneValue: string | null | undefined = undefined;
    if (data.phone !== undefined) {
      if (data.phone == null) {
        phoneValue = null;
      } else {
        try {
          phoneValue = normalizePhoneOptional(data.phone);
        } catch (err: unknown) {
          throw createError(
            err instanceof Error ? err.message : "Invalid phone number",
            400,
          );
        }
      }
    }

    const updateData: {
      name?: string;
      website?: string | null;
      address?: string | null;
      phone?: string | null;
    } = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.address !== undefined && { address: data.address }),
      ...(phoneValue !== undefined && { phone: phoneValue }),
    };

    return companyRepository.update(id, tenantId, updateData);
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await companyRepository.findById(tenantId, id);
    if (!existing) throw createError("Company not found", 404);
    await companyRepository.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Company",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async listForSelect(tenantId: string) {
    return companyRepository.findForSelect(tenantId);
  }
}

export default new CompanyService();
