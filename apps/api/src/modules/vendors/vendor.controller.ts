import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { logger } from "@/config/logger";
import { env } from "@/config/env";

class VendorController {
  // Create vendor (admin and superAdmin only)
  async createVendor(req: Request, res: Response) {
    try {
      const { name, contact, phone, address } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Vendor name is required" });
      }

      const existing = await prisma.vendor.findUnique({
        where: { name },
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
    } catch (error: any) {
      logger.error("Create vendor error", req.requestId, error);
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Vendor with this name already exists",
          error: error.message,
        });
      }
      res.status(500).json({
        message: "Error creating vendor",
        ...(env.isDev && { error: error.message }),
      });
    }
  }

  // Get all vendors (all authenticated users can view)
  async getAllVendors(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

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

      const where: any = {};
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
    } catch (error: any) {
      logger.error("Get all vendors error", req.requestId, error);
      res.status(500).json({
        message: "Error fetching vendors",
        ...(env.isDev && { error: error.message }),
      });
    }
  }

  // Get vendor by ID
  async getVendorById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              imsCode: true,
              name: true,
              mrp: true,
              costPrice: true,
            },
            take: 20,
          },
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
    } catch (error: any) {
      logger.error("Get vendor by ID error", req.requestId, error);
      res.status(500).json({
        message: "Error fetching vendor",
        ...(env.isDev && { error: error.message }),
      });
    }
  }

  // Update vendor
  async updateVendor(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name, contact, phone, address } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      const existingVendor = await prisma.vendor.findUnique({
        where: { id },
      });

      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      if (name && name !== existingVendor.name) {
        const nameExists = await prisma.vendor.findUnique({
          where: { name },
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
    } catch (error: any) {
      logger.error("Update vendor error", req.requestId, error);
      if (error.code === "P2002") {
        return res.status(400).json({
          message: "Vendor with this name already exists",
          error: error.message,
        });
      }
      res.status(500).json({
        message: "Error updating vendor",
        ...(env.isDev && { error: error.message }),
      });
    }
  }

  // Delete vendor
  async deleteVendor(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        return res.status(400).json({ message: "Vendor ID is required" });
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id },
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
        return res.status(400).json({
          message: "Cannot delete vendor with existing products",
        });
      }

      await prisma.vendor.delete({
        where: { id },
      });

      res.status(200).json({
        message: "Vendor deleted successfully",
      });
    } catch (error: any) {
      logger.error("Delete vendor error", req.requestId, error);
      res.status(500).json({
        message: "Error deleting vendor",
        ...(env.isDev && { error: error.message }),
      });
    }
  }
}

const vendorController = new VendorController();
export default vendorController;
