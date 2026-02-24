/**
 * Activities service - business logic for activities module.
 */

import { NotFoundError } from "@/shared/errors";
import { activitiesRepository } from "./activities.repository";

const ACTIVITY_TYPES = ["CALL", "MEETING"] as const;

export type CreateActivityInput = {
  type: string;
  subject?: string | null;
  notes?: string | null;
  activityAt?: string | Date | null;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
};

export const activitiesService = {
  async create(tenantId: string, userId: string, input: CreateActivityInput) {
    const activityAt = input.activityAt
      ? new Date(input.activityAt)
      : new Date();
    return activitiesRepository.create({
      tenant: { connect: { id: tenantId } },
      type: (ACTIVITY_TYPES as readonly string[]).includes(input.type)
        ? (input.type as (typeof ACTIVITY_TYPES)[number])
        : "CALL",
      subject: input.subject ?? null,
      notes: input.notes ?? null,
      activityAt,
      contact: input.contactId
        ? { connect: { id: input.contactId } }
        : undefined,
      member: input.memberId ? { connect: { id: input.memberId } } : undefined,
      deal: input.dealId ? { connect: { id: input.dealId } } : undefined,
      creator: { connect: { id: userId } },
    });
  },

  async getByContact(tenantId: string, contactId: string) {
    const activities = await activitiesRepository.findManyByContact(
      tenantId,
      contactId,
    );
    return { activities };
  },

  async getByDeal(tenantId: string, dealId: string) {
    const activities = await activitiesRepository.findManyByDeal(
      tenantId,
      dealId,
    );
    return { activities };
  },

  async getById(id: string, tenantId: string) {
    const activity = await activitiesRepository.findById(id, tenantId);
    if (!activity) {
      throw new NotFoundError("Activity not found");
    }
    return activity;
  },

  async delete(id: string, tenantId: string) {
    const existing = await activitiesRepository.findByIdForDelete(id, tenantId);
    if (!existing) {
      throw new NotFoundError("Activity not found");
    }
    await activitiesRepository.softDelete(id);
  },
};
