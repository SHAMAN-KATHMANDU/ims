import formsRepository from "./forms.repository";
import type { CreateFormInput, UpdateFormInput } from "./forms.schema";
import { createError } from "@/middlewares/errorHandler";

class FormsService {
  async list(tenantId: string) {
    return formsRepository.list(tenantId);
  }

  async get(tenantId: string, id: string) {
    return formsRepository.getById(tenantId, id);
  }

  async create(tenantId: string, data: CreateFormInput) {
    // Validate slug uniqueness
    const existing = await formsRepository.getBySlug(tenantId, data.slug);
    if (existing) {
      throw createError("Slug already in use", 409);
    }

    return formsRepository.create(tenantId, data);
  }

  async update(tenantId: string, id: string, data: UpdateFormInput) {
    return formsRepository.update(tenantId, id, data);
  }

  async delete(tenantId: string, id: string) {
    return formsRepository.softDelete(tenantId, id);
  }

  async listSubmissions(
    tenantId: string,
    formId: string,
    limit?: number,
    offset?: number,
  ) {
    // Verify form exists
    await formsRepository.getById(tenantId, formId);
    return formsRepository.listSubmissions(tenantId, formId, limit, offset);
  }
}

export default new FormsService();
