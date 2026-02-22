import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { sendControllerError } from "@/utils/controllerError";
import type { LeadStatus } from "./lead.schema";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

class LeadController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const {
        name,
        email,
        phone,
        companyName,
        status,
        source,
        notes,
        assignedToId,
      } = req.body;
      const assigneeId = assignedToId || userId;

      const lead = await prisma.lead.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name,
          email: email || null,
          phone: phone || null,
          companyName: companyName || null,
          status: (status as LeadStatus) ?? "NEW",
          source: source || null,
          notes: notes || null,
          assignedTo: { connect: { id: assigneeId } },
          creator: { connect: { id: userId } },
        } as Prisma.LeadCreateInput,
        include: {
          assignedTo: { select: { id: true, username: true } },
          creator: { select: { id: true, username: true } },
        },
      });

      res.status(201).json({ message: "Lead created successfully", lead });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create lead error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const query = getValidatedQuery<{
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        status?: LeadStatus;
        source?: string;
        assignedToId?: string;
      }>(req, res);
      const { page, limit, sortBy, sortOrder, search } =
        getPaginationParams(query);
      const { status, source, assignedToId } = query;

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "name",
        "status",
        "id",
      ];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
        ];
      }
      if (status) where.status = status;
      if (source) where.source = source;
      if (assignedToId) where.assignedToId = assignedToId;

      const skip = (page - 1) * limit;

      const [totalItems, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            assignedTo: { select: { id: true, username: true } },
            creator: { select: { id: true, username: true } },
          },
        }),
      ]);

      const result = createPaginationResult(leads, totalItems, page, limit);
      res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get leads error");
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedTo: { select: { id: true, username: true } },
          creator: { select: { id: true, username: true } },
          convertedDeal: true,
        },
      });

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.status(200).json({ message: "OK", lead });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get lead by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        phone,
        companyName,
        status,
        source,
        notes,
        assignedToId,
      } = req.body;

      const existing = await prisma.lead.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const updateData: Record<string, unknown> = {
        ...(name !== undefined && { name: name || existing.name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(companyName !== undefined && { companyName: companyName || null }),
        ...(status !== undefined && { status }),
        ...(source !== undefined && { source: source || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(assignedToId !== undefined && { assignedToId }),
      };

      const lead = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, username: true } },
          creator: { select: { id: true, username: true } },
        },
      });

      res.status(200).json({ message: "Lead updated successfully", lead });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update lead error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.lead.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }

      await prisma.lead.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete lead error");
    }
  }

  async convert(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { id } = req.params;
      const { contactId, dealName, dealValue, pipelineId } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "CONVERTED") {
        return res.status(400).json({ message: "Lead already converted" });
      }

      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { isDefault: true },
        orderBy: { createdAt: "asc" },
      });
      const pipeline = pipelineId
        ? await prisma.pipeline.findUnique({ where: { id: pipelineId } })
        : defaultPipeline;

      if (!pipeline) {
        return res.status(400).json({
          message: "No pipeline found. Create a default pipeline first.",
        });
      }

      const stages = pipeline.stages as Array<{ id: string; name: string }>;
      const firstStage =
        Array.isArray(stages) && stages.length > 0
          ? stages[0].name
          : "Qualification";

      let memberId: string | null = null;
      if (lead.phone && lead.phone.trim()) {
        let member = await prisma.member.findFirst({
          where: { phone: lead.phone.trim() },
          select: { id: true },
        });
        if (!member) {
          member = await prisma.member.create({
            data: {
              tenant: { connect: { id: tenantId } },
              phone: lead.phone.trim(),
              name: lead.name?.trim() || null,
              email: lead.email?.trim() || null,
            },
            select: { id: true },
          });
        }
        memberId = member.id;
      }

      let contact;
      if (contactId) {
        contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact)
          return res.status(404).json({ message: "Contact not found" });
      } else {
        let companyId: string | null = null;
        if (lead.companyName) {
          let company = await prisma.company.findFirst({
            where: {
              tenant: { id: tenantId },
              name: lead.companyName,
            } as Prisma.CompanyWhereInput,
            select: { id: true },
          });
          if (!company) {
            company = await prisma.company.create({
              data: {
                tenant: { connect: { id: tenantId } },
                name: lead.companyName,
              } as Prisma.CompanyCreateInput,
              select: { id: true },
            });
          }
          companyId = company.id;
        }

        contact = await prisma.contact.create({
          data: {
            tenant: { connect: { id: tenantId } },
            firstName: lead.name.split(" ")[0] || lead.name,
            lastName: lead.name.split(" ").slice(1).join(" ") || null,
            email: lead.email,
            phone: lead.phone,
            company: companyId ? { connect: { id: companyId } } : undefined,
            member: memberId ? { connect: { id: memberId } } : undefined,
            owner: { connect: { id: lead.assignedToId } },
            creator: { connect: { id: userId } },
          } as Prisma.ContactCreateInput,
        });
      }

      const deal = await prisma.deal.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name: dealName || `${lead.name} - Deal`,
          value: Number(dealValue) || 0,
          stage: firstStage,
          probability: 10,
          status: "OPEN",
          contact: { connect: { id: contact.id } },
          member: memberId ? { connect: { id: memberId } } : undefined,
          company: contact.companyId
            ? { connect: { id: contact.companyId } }
            : undefined,
          pipeline: { connect: { id: pipeline.id } },
          assignedTo: { connect: { id: lead.assignedToId } },
          creator: { connect: { id: userId } },
          lead: { connect: { id: lead.id } },
        } as Prisma.DealCreateInput,
        include: {
          contact: true,
          member: true,
          company: true,
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
        },
      });

      await prisma.lead.update({
        where: { id },
        data: { status: "CONVERTED", convertedAt: new Date() },
      });

      const updatedLead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedTo: { select: { id: true, username: true } },
          convertedDeal: true,
        },
      });

      res.status(200).json({
        message: "Lead converted successfully",
        lead: updatedLead,
        contact,
        deal,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Convert lead error");
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      const lead = await prisma.lead.update({
        where: { id },
        data: { assignedToId },
        include: {
          assignedTo: { select: { id: true, username: true } },
        },
      });

      const userId = getUserId(req);
      if (userId && userId !== assignedToId) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: "LEAD_ASSIGNMENT",
            title: "Lead assigned",
            message: `You were assigned to lead: ${lead.name}`,
            resourceType: "lead",
            resourceId: lead.id,
          },
        });
      }

      res.status(200).json({ message: "Lead assigned", lead });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Assign lead error");
    }
  }
}

export default new LeadController();
