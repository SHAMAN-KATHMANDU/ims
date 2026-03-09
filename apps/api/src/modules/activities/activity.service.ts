import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import activityRepository from "./activity.repository";
import type { CreateActivityDto } from "./activity.schema";

export class ActivityService {
  async create(tenantId: string, userId: string, data: CreateActivityDto) {
    const activityAt = data.activityAt ? new Date(data.activityAt) : new Date();

    return activityRepository.create({
      tenantId,
      type: data.type,
      subject: data.subject ?? null,
      notes: data.notes ?? null,
      activityAt,
      contactId: data.contactId || null,
      memberId: data.memberId || null,
      dealId: data.dealId || null,
      createdById: userId,
    });
  }

  async getByContact(tenantId: string, contactId: string) {
    return activityRepository.findByContact(tenantId, contactId);
  }

  async getByDeal(tenantId: string, dealId: string) {
    return activityRepository.findByDeal(tenantId, dealId);
  }

  async getById(tenantId: string, id: string) {
    const activity = await activityRepository.findById(tenantId, id);
    if (!activity) throw createError("Activity not found", 404);
    return activity;
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await activityRepository.findById(tenantId, id);
    if (!existing) throw createError("Activity not found", 404);
    await activityRepository.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Activity",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

export default new ActivityService();
