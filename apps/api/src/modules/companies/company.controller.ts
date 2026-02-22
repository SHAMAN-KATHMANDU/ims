import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

class CompanyController {
  async create(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { name, website, address, phone } = req.body;

      const company = await prisma.company.create({
        data: {
          tenantId,
          name,
          website: website || null,
          address: address || null,
          phone: phone || null,
        },
      });

      res
        .status(201)
        .json({ message: "Company created successfully", company });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create company error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const query = req.query as {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: "createdAt" | "updatedAt" | "name" | "id";
        sortOrder?: "asc" | "desc";
      };
      const { page, limit, sortBy, sortOrder, search } =
        getPaginationParams(query);

      const allowedSortFields = ["createdAt", "updatedAt", "name", "id"];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        name: "asc",
      };

      const where: { OR?: Array<Record<string, unknown>> } = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" as const } },
          { website: { contains: search, mode: "insensitive" as const } },
        ];
      }

      const skip = (page - 1) * limit;

      const [totalItems, companies] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: { select: { contacts: true, deals: true } },
          },
        }),
      ]);

      const result = createPaginationResult(companies, totalItems, page, limit);
      res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get companies error");
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          _count: { select: { deals: true } },
        },
      });

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.status(200).json({ message: "OK", company });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get company by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, website, address, phone } = req.body;

      const existing = await prisma.company.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Company not found" });
      }

      const company = await prisma.company.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name || existing.name }),
          ...(website !== undefined && { website: website || null }),
          ...(address !== undefined && { address: address || null }),
          ...(phone !== undefined && { phone: phone || null }),
        },
      });

      res
        .status(200)
        .json({ message: "Company updated successfully", company });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update company error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.company.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Company not found" });
      }

      await prisma.company.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Company deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete company error");
    }
  }

  async listForSelect(req: Request, res: Response) {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: 500,
      });
      res.status(200).json({ message: "OK", companies });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "List companies for select error",
      );
    }
  }
}

export default new CompanyController();
