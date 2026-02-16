import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
] as const;

class LeadController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

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
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Lead name is required" });
      }

      const assigneeId = assignedToId || userId;

      const lead = await prisma.lead.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          companyName: companyName?.trim() || null,
          status: status && LEAD_STATUSES.includes(status) ? status : "NEW",
          source: source?.trim() || null,
          notes: notes?.trim() || null,
          assignedToId: assigneeId,
          createdById: userId,
        },
        include: {
          assignedTo: { select: { id: true, username: true } },
          creator: { select: { id: true, username: true } },
        },
      });

      res.status(201).json({ message: "Lead created successfully", lead });
    } catch (error: unknown) {
      console.error("Create lead error:", error);
      res.status(500).json({
        message: "Error creating lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );
      const status = req.query.status as string | undefined;
      const source = req.query.source as string | undefined;
      const assignedToId = req.query.assignedToId as string | undefined;

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
      if (status && LEAD_STATUSES.includes(status as any))
        where.status = status;
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
      console.error("Get leads error:", error);
      res.status(500).json({
        message: "Error fetching leads",
        error: error instanceof Error ? error.message : String(error),
      });
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
      console.error("Get lead by id error:", error);
      res.status(500).json({
        message: "Error fetching lead",
        error: error instanceof Error ? error.message : String(error),
      });
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
        ...(name !== undefined && { name: name?.trim() || existing.name }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(companyName !== undefined && {
          companyName: companyName?.trim() || null,
        }),
        ...(status !== undefined &&
          LEAD_STATUSES.includes(status as any) && { status }),
        ...(source !== undefined && { source: source?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
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
      console.error("Update lead error:", error);
      res.status(500).json({
        message: "Error updating lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.lead.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }

      await prisma.lead.delete({ where: { id } });
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error: unknown) {
      console.error("Delete lead error:", error);
      res.status(500).json({
        message: "Error deleting lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async convert(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

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
            where: { name: lead.companyName },
            select: { id: true },
          });
          if (!company) {
            company = await prisma.company.create({
              data: { name: lead.companyName },
              select: { id: true },
            });
          }
          companyId = company.id;
        }

        contact = await prisma.contact.create({
          data: {
            firstName: lead.name.split(" ")[0] || lead.name,
            lastName: lead.name.split(" ").slice(1).join(" ") || null,
            email: lead.email,
            phone: lead.phone,
            companyId,
            memberId,
            ownedById: lead.assignedToId,
            createdById: userId,
          },
        });
      }

      const deal = await prisma.deal.create({
        data: {
          name: dealName || `${lead.name} - Deal`,
          value: Number(dealValue) || 0,
          stage: firstStage,
          probability: 10,
          status: "OPEN",
          contactId: contact.id,
          memberId: memberId || undefined,
          companyId: contact.companyId,
          pipelineId: pipeline.id,
          assignedToId: lead.assignedToId,
          createdById: userId,
          leadId: lead.id,
        },
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
      console.error("Convert lead error:", error);
      res.status(500).json({
        message: "Error converting lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        return res.status(400).json({ message: "assignedToId is required" });
      }

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
      console.error("Assign lead error:", error);
      res.status(500).json({
        message: "Error assigning lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default new LeadController();
