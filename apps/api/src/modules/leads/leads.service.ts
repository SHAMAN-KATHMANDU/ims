/**
 * Leads service: create, list, getById, update, delete, convert, assign.
 * Uses leads repository and (for convert/assign) deals, members, contacts, notifications repositories.
 */

import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { NotFoundError, DomainError } from "@/shared/errors";
import * as repo from "./leads.repository";
import { dealsRepository } from "@/modules/deals/deals.repository";
import { membersRepository } from "@/modules/members/members.repository";
import * as contactsRepo from "@/modules/contacts/contacts.repository";
import { notificationsRepository } from "@/modules/notifications/notifications.repository";
import type { LeadStatus } from "./lead.schema";

export type CreateLeadInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status?: LeadStatus;
  source?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
};

export type ListLeadsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: LeadStatus;
  source?: string;
  assignedToId?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

export async function create(
  tenantId: string,
  userId: string,
  input: CreateLeadInput,
) {
  const assigneeId = input.assignedToId ?? userId;
  return repo.createLead({
    tenantId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    companyName: input.companyName ?? null,
    status: (input.status as import("@prisma/client").LeadStatus) ?? "NEW",
    source: input.source ?? null,
    notes: input.notes ?? null,
    assignedToId: assigneeId,
    createdById: userId,
  });
}

export async function getAll(tenantId: string, query: ListLeadsQuery) {
  const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
    query as Parameters<typeof getPaginationParams>[0],
  );
  const { status, source, assignedToId } = query;

  const allowedSortFields = ["createdAt", "updatedAt", "name", "status", "id"];
  const orderBy =
    getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) ??
    ({ createdAt: "desc" } as Prisma.LeadOrderByWithRelationInput);

  const where: Prisma.LeadWhereInput = { tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (source) where.source = source;
  if (assignedToId) where.assignedToId = assignedToId;

  const skip = (page - 1) * limit;

  const [totalItems, leads] = await Promise.all([
    repo.countLeads(where),
    repo.findLeads(where, orderBy, skip, limit),
  ]);

  return createPaginationResult(leads, totalItems, page, limit);
}

export async function getById(tenantId: string, id: string) {
  const lead = await repo.findLeadById(tenantId, id);
  if (!lead) throw new NotFoundError("Lead not found");
  return lead;
}

export async function update(
  tenantId: string,
  id: string,
  input: UpdateLeadInput,
) {
  const existing = await repo.findLeadByIdForUpdate(tenantId, id);
  if (!existing) throw new NotFoundError("Lead not found");

  const updateData: Prisma.LeadUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name || existing.name;
  if (input.email !== undefined) updateData.email = input.email ?? null;
  if (input.phone !== undefined) updateData.phone = input.phone ?? null;
  if (input.companyName !== undefined)
    updateData.companyName = input.companyName ?? null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.source !== undefined) updateData.source = input.source ?? null;
  if (input.notes !== undefined) updateData.notes = input.notes ?? null;
  if (input.assignedToId !== undefined)
    updateData.assignedTo = { connect: { id: input.assignedToId } };

  return repo.updateLead(id, updateData);
}

export async function deleteLead(tenantId: string, id: string) {
  const existing = await repo.findLeadByIdForUpdate(tenantId, id);
  if (!existing) throw new NotFoundError("Lead not found");
  await repo.updateLead(id, { deletedAt: new Date() });
}

export type ConvertLeadInput = {
  contactId?: string;
  dealName?: string;
  dealValue?: number;
  pipelineId?: string;
};

export async function convert(
  tenantId: string,
  userId: string,
  leadId: string,
  input: ConvertLeadInput,
) {
  const lead = await repo.findLeadByIdForUpdate(tenantId, leadId);
  if (!lead) throw new NotFoundError("Lead not found");
  if (lead.status === "CONVERTED") {
    throw new DomainError(400, "Lead already converted", "ALREADY_CONVERTED");
  }

  const pipeline = await dealsRepository.findPipeline(
    input.pipelineId,
    tenantId,
  );
  if (!pipeline) {
    throw new DomainError(
      400,
      "No pipeline found. Create a default pipeline first.",
      "NO_PIPELINE",
    );
  }

  const firstStage =
    pipeline.pipelineStages.length > 0
      ? pipeline.pipelineStages[0].name
      : "Qualification";

  let memberId: string | null = null;
  if (lead.phone?.trim()) {
    let member = await membersRepository.findMemberByPhoneLight(
      tenantId,
      lead.phone.trim(),
    );
    if (!member) {
      member = await membersRepository.createMember({
        tenantId,
        phone: lead.phone.trim(),
        name: lead.name?.trim() ?? null,
        email: lead.email?.trim() ?? null,
      });
    }
    memberId = member.id;
  }

  let contactId: string;
  let companyId: string | null = null;
  let contactForResponse: {
    id: string;
    companyId: string | null;
    [k: string]: unknown;
  };

  if (input.contactId) {
    const existingContact = await contactsRepo.findContactByIdForUpdate(
      tenantId,
      input.contactId,
    );
    if (!existingContact) throw new NotFoundError("Contact not found");
    contactId = existingContact.id;
    companyId = existingContact.companyId;
    contactForResponse = existingContact;
  } else {
    let companyIdForContact: string | null = null;
    if (lead.companyName) {
      let company = await contactsRepo.findCompanyByName(
        tenantId,
        lead.companyName,
      );
      if (!company) {
        company = await contactsRepo.createCompany(tenantId, lead.companyName);
      }
      companyIdForContact = company.id;
    }
    const firstName = lead.name.split(" ")[0] || lead.name;
    const lastName = lead.name.split(" ").slice(1).join(" ") || null;
    const created = await contactsRepo.createContact({
      tenantId,
      firstName,
      lastName,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      companyId: companyIdForContact,
      memberId,
      ownedById: lead.assignedToId,
      createdById: userId,
    });
    contactId = created.id;
    companyId = created.companyId ?? null;
    contactForResponse = created;
  }

  const deal = await dealsRepository.createDeal({
    tenantId,
    name: input.dealName || `${lead.name} - Deal`,
    value: Number(input.dealValue) || 0,
    stage: firstStage,
    probability: 10,
    status: "OPEN",
    contactId,
    memberId: memberId ?? undefined,
    companyId: companyId ?? undefined,
    pipelineId: pipeline.id,
    assignedToId: lead.assignedToId,
    createdById: userId,
    leadId: lead.id,
  });

  await repo.updateLead(leadId, {
    status: "CONVERTED",
    convertedAt: new Date(),
  });

  const updatedLead = await repo.findLeadById(tenantId, leadId);
  return {
    lead: updatedLead,
    contact: contactForResponse,
    deal,
  };
}

export async function assign(
  tenantId: string,
  userId: string,
  leadId: string,
  assignedToId: string,
) {
  const existing = await repo.findLeadByIdForUpdate(tenantId, leadId);
  if (!existing) throw new NotFoundError("Lead not found");

  const lead = await repo.updateLead(leadId, {
    assignedTo: { connect: { id: assignedToId } },
  });

  if (userId !== assignedToId) {
    await notificationsRepository.create({
      user: { connect: { id: assignedToId } },
      type: "LEAD_ASSIGNMENT",
      title: "Lead assigned",
      message: `You were assigned to lead: ${lead.name}`,
      resourceType: "lead",
      resourceId: lead.id,
    });
  }

  return lead;
}
