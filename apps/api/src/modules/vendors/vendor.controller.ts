import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

class VendorController {
  // Create vendor (admin and superAdmin only). Tenant from session only — never from body.
  async createVendor(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { name, contact, phone, address } = req.body;

      const existing = await prisma.vendor.findFirst({
        where: { tenantId, name },
      });

      if (existing) {
        return res.status(409).json({
          message: "Vendor with this name already exists",
          existingVendor: {
            id: existing.id,
            name: existing.name,
          },
        });
      }

      const vendor = await prisma.vendor.create({
        data: {
          tenantId,
          name,
          contact: contact || null,
          phone: phone || null,
          address: address || null,
        },
      });

      res.status(201).json({
        message: "Vendor created successfully",
        vendor,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "Vendor with this name already exists",
        });
      }
      return sendControllerError(req, res, error, "Create vendor error");
    }
  }

  // Get all vendors (tenant-scoped; all authenticated users can view)
  async getAllVendors(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: "id" | "name" | "createdAt" | "updatedAt";
        sortOrder?: "asc" | "desc";
      };
      const { page, limit, sortBy, sortOrder, search } =
        getPaginationParams(query);

      const allowedSortFields: string[] = [
        "id",
        "name",
        "createdAt",
        "updatedAt",
      ];

      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        name: "asc",
      };

      const where: any = { tenantId };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { contact: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [totalItems, vendors] = await Promise.all([
        prisma.vendor.count({ where }),
        prisma.vendor.findMany({
          where,
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
            address: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const result = createPaginationResult(vendors, totalItems, page, limit);

      res.status(200).json({
        message: "Vendors fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all vendors error");
    }
  }

  // Get vendor by ID (tenant-scoped; return 404 if not in tenant)
  async getVendorById(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params as { id: string };

      const vendor = await prisma.vendor.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          name: true,
          contact: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      res.status(200).json({
        message: "Vendor fetched successfully",
        vendor,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get vendor by ID error");
    }
  }

  // Get vendor products (tenant-scoped; 404 if vendor not in tenant)
  async getVendorProducts(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params as { id: string };

      const vendor = await prisma.vendor.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const query = req.query as {
        page?: number;
        limit?: number;
        search?: string;
      };
      const { page, limit, search } = getPaginationParams(query);
      const productLimit = Math.min(50, Math.max(1, limit));
      const productPage = Math.max(1, page);
      const skip = (productPage - 1) * productLimit;

      const where: { vendorId: string; tenantId: string; OR?: unknown[] } = {
        vendorId: id,
        tenantId,
      };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" as const } },
          { imsCode: { contains: search, mode: "insensitive" as const } },
        ];
      }

      const [totalItems, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          select: {
            id: true,
            imsCode: true,
            name: true,
            mrp: true,
            costPrice: true,
          },
          orderBy: { name: "asc" },
          skip,
          take: productLimit,
        }),
      ]);

      const result = createPaginationResult(
        products,
        totalItems,
        productPage,
        productLimit,
      );

      res.status(200).json({
        message: "Vendor products fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get vendor products error");
    }
  }

  // Update vendor (tenant-scoped; 404 if not in tenant)
  async updateVendor(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params as { id: string };
      const { name, contact, phone, address } = req.body;

      const existingVendor = await prisma.vendor.findFirst({
        where: { id, tenantId },
      });

      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      if (name && name !== existingVendor.name) {
        const nameExists = await prisma.vendor.findFirst({
          where: { tenantId, name },
        });

        if (nameExists) {
          return res.status(409).json({
            message: "Vendor with this name already exists",
            existingVendor: {
              id: nameExists.id,
              name: nameExists.name,
            },
          });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (contact !== undefined) updateData.contact = contact || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (address !== undefined) updateData.address = address || null;

      const updatedVendor = await prisma.vendor.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({
        message: "Vendor updated successfully",
        vendor: updatedVendor,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "Vendor with this name already exists",
        });
      }
      return sendControllerError(req, res, error, "Update vendor error");
    }
  }

  // Delete vendor (tenant-scoped; 404 if not in tenant)
  async deleteVendor(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params as { id: string };

      const vendor = await prisma.vendor.findFirst({
        where: { id, tenantId },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      if (vendor._count.products > 0) {
        const count = vendor._count.products;
        return res.status(400).json({
          message: `Cannot delete vendor — ${count} product${count === 1 ? "" : "s"} are associated. Please reassign or remove those products first.`,
          productCount: count,
        });
      }

      await prisma.vendor.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      res.status(200).json({
        message: "Vendor deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete vendor error");
    }
  }
}

const vendorController = new VendorController();
export default vendorController;
