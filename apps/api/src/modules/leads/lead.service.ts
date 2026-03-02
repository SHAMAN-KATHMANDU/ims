import { createError } from "@/middlewares/errorHandler";
import { normalizePhoneOptional } from "@/utils/phone";
import leadRepository from "./lead.repository";
import type {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  AssignLeadDto,
} from "./lead.schema";

export class LeadService {
  async create(tenantId: string, userId: string, data: CreateLeadDto) {
    const assigneeId = data.assignedToId ?? userId;

    let phoneNormalized: string | null = null;
    if (data.phone && String(data.phone).trim()) {
      try {
        phoneNormalized = normalizePhoneOptional(data.phone);
      } catch (err: unknown) {
        throw createError(
          err instanceof Error ? err.message : "Invalid phone number",
          400,
        );
      }
    }

    return leadRepository.create({
      tenantId,
      name: data.name,
      email: data.email ?? null,
      phone: phoneNormalized,
      companyName: data.companyName ?? null,
      status: data.status ?? "NEW",
      source: data.source ?? null,
      notes: data.notes ?? null,
      assignedToId: assigneeId,
      createdById: userId,
    });
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return leadRepository.findAll(tenantId, query);
  }

  async getById(tenantId: string, id: string) {
    const lead = await leadRepository.findById(tenantId, id);
    if (!lead) throw createError("Lead not found", 404);
    return lead;
  }

  async update(tenantId: string, id: string, data: UpdateLeadDto) {
    const existing = await leadRepository.findById(tenantId, id);
    if (!existing) throw createError("Lead not found", 404);

    let phoneNormalized: string | null | undefined = undefined;
    if (data.phone !== undefined) {
      if (data.phone == null || String(data.phone).trim() === "") {
        phoneNormalized = null;
      } else {
        try {
          phoneNormalized = normalizePhoneOptional(data.phone);
        } catch (err: unknown) {
          throw createError(
            err instanceof Error ? err.message : "Invalid phone number",
            400,
          );
        }
      }
    }

    const updateData: Parameters<typeof leadRepository.update>[1] = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email ?? null }),
      ...(phoneNormalized !== undefined && { phone: phoneNormalized }),
      ...(data.companyName !== undefined && {
        companyName: data.companyName ?? null,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.source !== undefined && { source: data.source ?? null }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
      ...(data.assignedToId !== undefined && {
        assignedToId: data.assignedToId,
      }),
    };

    return leadRepository.update(id, updateData);
  }

  async delete(tenantId: string, id: string) {
    const existing = await leadRepository.findById(tenantId, id);
    if (!existing) throw createError("Lead not found", 404);
    await leadRepository.softDelete(id);
  }

  async convert(
    tenantId: string,
    userId: string,
    id: string,
    data: ConvertLeadDto,
  ) {
    const lead = await leadRepository.findById(tenantId, id);
    if (!lead) throw createError("Lead not found", 404);
    if (lead.status === "CONVERTED") {
      throw createError("Lead already converted", 400);
    }

    const defaultPipeline = await leadRepository.findDefaultPipeline(tenantId);
    const pipeline = data.pipelineId
      ? await leadRepository.findPipelineById(tenantId, data.pipelineId)
      : defaultPipeline;

    if (!pipeline) {
      throw createError(
        "No pipeline found. Create a default pipeline first.",
        400,
      );
    }

    const stages = pipeline.stages as
      | Array<{ id: string; name: string }>
      | undefined;
    const firstStage =
      Array.isArray(stages) && stages.length > 0
        ? stages[0].name
        : "Qualification";

    let memberId: string | null = null;
    if (lead.phone && lead.phone.trim()) {
      let member = await leadRepository.findMemberByPhone(
        tenantId,
        lead.phone.trim(),
      );
      if (!member) {
        member = await leadRepository.createMember({
          tenantId,
          phone: lead.phone.trim(),
          name: lead.name?.trim() || null,
          email: lead.email?.trim() || null,
        });
      }
      memberId = member.id;
    }

    let contact;
    if (data.contactId) {
      contact = await leadRepository.findContactById(tenantId, data.contactId);
      if (!contact) throw createError("Contact not found", 404);
    } else {
      let companyId: string | null = null;
      if (lead.companyName) {
        let company = await leadRepository.findCompanyByName(
          tenantId,
          lead.companyName,
        );
        if (!company) {
          company = await leadRepository.createCompany(
            tenantId,
            lead.companyName,
          );
        }
        companyId = company.id;
      }

      contact = await leadRepository.createContact({
        tenantId,
        firstName: lead.name.split(" ")[0] || lead.name,
        lastName: lead.name.split(" ").slice(1).join(" ") || null,
        email: lead.email,
        phone: lead.phone,
        companyId,
        memberId,
        ownedById: lead.assignedToId,
        createdById: userId,
      });
    }

    const deal = await leadRepository.createDeal({
      tenantId,
      name: data.dealName || `${lead.name} - Deal`,
      value: data.dealValue ?? 0,
      stage: firstStage,
      probability: 10,
      status: "OPEN",
      contactId: contact.id,
      memberId: memberId ?? undefined,
      companyId: contact.companyId,
      pipelineId: pipeline.id,
      assignedToId: lead.assignedToId,
      createdById: userId,
      leadId: lead.id,
    });

    await leadRepository.markLeadConverted(id);
    const updatedLead = await leadRepository.findLeadByIdWithDeal(id);

    return { lead: updatedLead, contact, deal };
  }

  async assign(
    tenantId: string,
    userId: string,
    id: string,
    data: AssignLeadDto,
  ) {
    const existing = await leadRepository.findById(tenantId, id);
    if (!existing) throw createError("Lead not found", 404);

    const lead = await leadRepository.update(id, {
      assignedToId: data.assignedToId,
    });

    if (userId !== data.assignedToId) {
      await leadRepository.createNotification({
        userId: data.assignedToId,
        type: "LEAD_ASSIGNMENT",
        title: "Lead assigned",
        message: `You were assigned to lead: ${lead.name}`,
        resourceType: "lead",
        resourceId: lead.id,
      });
    }

    return lead;
  }
}

export default new LeadService();
