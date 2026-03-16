import { createError } from "@/middlewares/errorHandler";
import { createPaginationResult } from "@/utils/pagination";
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

  async getByContact(
    tenantId: string,
    contactId: string,
    query?: {
      page?: number;
      limit?: number;
      type?: "CALL" | "EMAIL" | "MEETING";
    },
  ) {
    const page = query?.page;
    const limit = query?.limit;
    const type = query?.type;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const activities = await activityRepository.findByContact(
        tenantId,
        contactId,
        type,
      );
      return { activities };
    }
    const [activities, totalItems] = await Promise.all([
      activityRepository.findByContactPaginated(
        tenantId,
        contactId,
        (page - 1) * limit,
        limit,
        type,
      ),
      activityRepository.countByContact(tenantId, contactId, type),
    ]);
    const result = createPaginationResult(activities, totalItems, page, limit);
    return { activities: result.data, pagination: result.pagination };
  }

  async getByDeal(
    tenantId: string,
    dealId: string,
    query?: {
      page?: number;
      limit?: number;
      type?: "CALL" | "EMAIL" | "MEETING";
    },
  ) {
    const page = query?.page;
    const limit = query?.limit;
    const type = query?.type;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const activities = await activityRepository.findByDeal(
        tenantId,
        dealId,
        type,
      );
      return { activities };
    }
    const [activities, totalItems] = await Promise.all([
      activityRepository.findByDealPaginated(
        tenantId,
        dealId,
        (page - 1) * limit,
        limit,
        type,
      ),
      activityRepository.countByDeal(tenantId, dealId, type),
    ]);
    const result = createPaginationResult(activities, totalItems, page, limit);
    return { activities: result.data, pagination: result.pagination };
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
