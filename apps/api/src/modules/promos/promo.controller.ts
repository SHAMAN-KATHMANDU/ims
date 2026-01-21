import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

class PromoController {
  // Create promo code
  async createPromo(req: Request, res: Response) {
    try {
      const {
        code,
        description,
        valueType,
        value,
        overrideDiscounts,
        allowStacking,
        eligibility,
        validFrom,
        validTo,
        usageLimit,
        isActive,
        productIds,
      } = req.body;

      if (!code?.trim()) {
        return res.status(400).json({ message: "Promo code is required" });
      }
      if (!valueType || !["PERCENTAGE", "FLAT"].includes(valueType)) {
        return res.status(400).json({
          message: "Invalid valueType. Must be PERCENTAGE or FLAT",
        });
      }
      if (value === undefined || value === null || isNaN(Number(value))) {
        return res.status(400).json({ message: "Valid value is required" });
      }

      const existing = await prisma.promoCode.findUnique({
        where: { code },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Promo code with this code already exists" });
      }

      const promo = await prisma.promoCode.create({
        data: {
          code: code.trim(),
          description: description || null,
          valueType,
          value: Number(value),
          overrideDiscounts: !!overrideDiscounts,
          allowStacking: !!allowStacking,
          eligibility: eligibility || "ALL",
          validFrom: validFrom ? new Date(validFrom) : null,
          validTo: validTo ? new Date(validTo) : null,
          usageLimit: usageLimit !== undefined ? Number(usageLimit) : null,
          isActive: isActive !== undefined ? !!isActive : true,
          products:
            Array.isArray(productIds) && productIds.length > 0
              ? {
                  create: productIds.map((productId: string) => ({
                    productId,
                  })),
                }
              : undefined,
        },
        include: {
          products: {
            include: {
              product: {
                select: { id: true, name: true, imsCode: true },
              },
            },
          },
        },
      });

      return res.status(201).json({
        message: "Promo code created successfully",
        promo,
      });
    } catch (error: any) {
      console.error("Create promo error:", error);
      return res
        .status(500)
        .json({ message: "Error creating promo code", error: error.message });
    }
  }

  // Get all promo codes
  async getAllPromos(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      const isActive =
        typeof req.query.isActive === "string"
          ? req.query.isActive === "true"
          : undefined;

      const allowedSortFields = [
        "code",
        "createdAt",
        "updatedAt",
        "validFrom",
        "validTo",
      ];

      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      const where: any = {};
      if (search) {
        where.OR = [
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const skip = (page - 1) * limit;

      const [totalItems, promos] = await Promise.all([
        prisma.promoCode.count({ where }),
        prisma.promoCode.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            products: {
              include: {
                product: {
                  select: { id: true, name: true, imsCode: true },
                },
              },
            },
          },
        }),
      ]);

      const result = createPaginationResult(promos, totalItems, page, limit);

      return res.status(200).json({
        message: "Promo codes fetched successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Get promos error:", error);
      return res
        .status(500)
        .json({ message: "Error fetching promo codes", error: error.message });
    }
  }

  // Get promo by ID
  async getPromoById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const promo = await prisma.promoCode.findUnique({
        where: { id },
        include: {
          products: {
            include: {
              product: {
                select: { id: true, name: true, imsCode: true },
              },
            },
          },
        },
      });

      if (!promo) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      return res.status(200).json({
        message: "Promo code fetched successfully",
        promo,
      });
    } catch (error: any) {
      console.error("Get promo by ID error:", error);
      return res.status(500).json({
        message: "Error fetching promo code",
        error: error.message,
      });
    }
  }

  // Update promo code
  async updatePromo(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const existing = await prisma.promoCode.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      const {
        code,
        description,
        valueType,
        value,
        overrideDiscounts,
        allowStacking,
        eligibility,
        validFrom,
        validTo,
        usageLimit,
        isActive,
        productIds,
      } = req.body;

      const data: any = {};

      if (code !== undefined) {
        if (!code.trim()) {
          return res
            .status(400)
            .json({ message: "Promo code cannot be empty" });
        }
        data.code = code.trim();
      }
      if (description !== undefined) {
        data.description = description || null;
      }
      if (valueType !== undefined) {
        if (!["PERCENTAGE", "FLAT"].includes(valueType)) {
          return res.status(400).json({
            message: "Invalid valueType. Must be PERCENTAGE or FLAT",
          });
        }
        data.valueType = valueType;
      }
      if (value !== undefined) {
        if (value === null || isNaN(Number(value))) {
          return res.status(400).json({ message: "Valid value is required" });
        }
        data.value = Number(value);
      }
      if (overrideDiscounts !== undefined) {
        data.overrideDiscounts = !!overrideDiscounts;
      }
      if (allowStacking !== undefined) {
        data.allowStacking = !!allowStacking;
      }
      if (eligibility !== undefined) {
        data.eligibility = eligibility;
      }
      if (validFrom !== undefined) {
        data.validFrom = validFrom ? new Date(validFrom) : null;
      }
      if (validTo !== undefined) {
        data.validTo = validTo ? new Date(validTo) : null;
      }
      if (usageLimit !== undefined) {
        data.usageLimit = usageLimit !== null ? Number(usageLimit) : null;
      }
      if (isActive !== undefined) {
        data.isActive = !!isActive;
      }

      // Update promo and related products in a transaction
      const promo = await prisma.$transaction(async (tx) => {
        const updatedPromo = await tx.promoCode.update({
          where: { id },
          data,
        });

        if (Array.isArray(productIds)) {
          // Reset assigned products
          await tx.promoCodeProduct.deleteMany({
            where: { promoCodeId: id },
          });

          if (productIds.length > 0) {
            await tx.promoCodeProduct.createMany({
              data: productIds.map((productId: string) => ({
                promoCodeId: id,
                productId,
              })),
            });
          }
        }

        return tx.promoCode.findUnique({
          where: { id },
          include: {
            products: {
              include: {
                product: {
                  select: { id: true, name: true, imsCode: true },
                },
              },
            },
          },
        });
      });

      return res.status(200).json({
        message: "Promo code updated successfully",
        promo,
      });
    } catch (error: any) {
      console.error("Update promo error:", error);
      return res
        .status(500)
        .json({ message: "Error updating promo code", error: error.message });
    }
  }

  // Soft delete / deactivate promo code
  async deletePromo(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const existing = await prisma.promoCode.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      await prisma.promoCode.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(200).json({
        message: "Promo code deactivated successfully",
      });
    } catch (error: any) {
      console.error("Delete promo error:", error);
      return res
        .status(500)
        .json({ message: "Error deleting promo code", error: error.message });
    }
  }
}

export default new PromoController();
