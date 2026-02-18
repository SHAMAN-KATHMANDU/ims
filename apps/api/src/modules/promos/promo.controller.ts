import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

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
        applyToAll,
        categoryIds,
        subCategories,
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

      const existing = await prisma.promoCode.findFirst({
        where: { code },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Promo code with this code already exists" });
      }

      const resolvedProductIds = await PromoController.resolveTargetProductIds({
        applyToAll,
        categoryIds,
        subCategories,
        explicitProductIds: Array.isArray(productIds) ? productIds : [],
      });

      const promo = await prisma.promoCode.create({
        data: {
          tenantId: req.user!.tenantId,
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
            resolvedProductIds.length > 0
              ? {
                  create: resolvedProductIds.map((productId: string) => ({
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create promo error");
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get promos error");
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get promo by ID error");
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
        applyToAll,
        categoryIds,
        subCategories,
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
        await tx.promoCode.update({
          where: { id },
          data,
        });

        if (
          productIds !== undefined ||
          applyToAll !== undefined ||
          categoryIds !== undefined ||
          subCategories !== undefined
        ) {
          const resolvedProductIds =
            await PromoController.resolveTargetProductIds({
              applyToAll,
              categoryIds,
              subCategories,
              explicitProductIds: Array.isArray(productIds) ? productIds : [],
            });

          await tx.promoCodeProduct.deleteMany({
            where: { promoCodeId: id },
          });

          if (resolvedProductIds.length > 0) {
            await tx.promoCodeProduct.createMany({
              data: resolvedProductIds.map((productId) => ({
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update promo error");
    }
  }

  private static async resolveTargetProductIds(params: {
    applyToAll?: boolean;
    categoryIds?: string[];
    subCategories?: string[];
    explicitProductIds?: string[];
  }): Promise<string[]> {
    const {
      applyToAll,
      categoryIds,
      subCategories,
      explicitProductIds = [],
    } = params;

    const ids = new Set<string>(explicitProductIds);

    if (applyToAll) {
      const allProducts = await prisma.product.findMany({
        select: { id: true },
      });
      allProducts.forEach((p) => ids.add(p.id));
      return Array.from(ids);
    }

    const orConditions: any[] = [];
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      orConditions.push({ categoryId: { in: categoryIds } });
    }
    if (Array.isArray(subCategories) && subCategories.length > 0) {
      orConditions.push({ subCategory: { in: subCategories } });
    }

    if (orConditions.length > 0) {
      const filteredProducts = await prisma.product.findMany({
        where: { OR: orConditions },
        select: { id: true },
      });
      filteredProducts.forEach((p) => ids.add(p.id));
    }

    return Array.from(ids);
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete promo error");
    }
  }
}

export default new PromoController();
