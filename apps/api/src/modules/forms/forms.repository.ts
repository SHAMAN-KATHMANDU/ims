import prisma from "@/config/prisma";
import type { CreateFormInput, UpdateFormInput } from "./forms.schema";
import { createError } from "@/middlewares/errorHandler";

class FormsRepository {
  async list(tenantId: string) {
    return prisma.form.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getById(tenantId: string, id: string) {
    const form = await prisma.form.findFirst({
      where: { tenantId, id, deletedAt: null },
    });
    if (!form) throw createError("Form not found", 404);
    return form;
  }

  async getBySlug(tenantId: string, slug: string) {
    return prisma.form.findFirst({
      where: { tenantId, slug, deletedAt: null },
    });
  }

  async create(tenantId: string, data: CreateFormInput) {
    return prisma.form.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        fields: data.fields as unknown as any,
        submitTo: data.submitTo,
        recipients: data.recipients,
        successMessage: data.successMessage,
        status: data.status,
      },
    });
  }

  async update(tenantId: string, id: string, data: UpdateFormInput) {
    const form = await this.getById(tenantId, id);

    // If slug is changing, check uniqueness
    if (data.slug && data.slug !== form.slug) {
      const existing = await prisma.form.findFirst({
        where: {
          tenantId,
          slug: data.slug,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (existing) throw createError("Slug already in use", 409);
    }

    return prisma.form.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.fields !== undefined && {
          fields: data.fields as unknown as any,
        }),
        ...(data.submitTo !== undefined && { submitTo: data.submitTo }),
        ...(data.recipients !== undefined && { recipients: data.recipients }),
        ...(data.successMessage !== undefined && {
          successMessage: data.successMessage,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async softDelete(tenantId: string, id: string) {
    const form = await this.getById(tenantId, id);
    return prisma.form.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementSubmissionCount(id: string) {
    return prisma.form.update({
      where: { id },
      data: { submissionCount: { increment: 1 } },
    });
  }

  async listSubmissions(
    tenantId: string,
    formId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const form = await this.getById(tenantId, formId);

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.formSubmission.count({
      where: { formId },
    });

    return { submissions, total };
  }
}

export default new FormsRepository();
