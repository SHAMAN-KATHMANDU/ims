/**
 * Product controller: update product.
 * Delegates to products.service.updateProduct.
 */

import { Request, Response } from "express";
import { parseDate } from "@repo/shared";
import { ok, fail } from "@/shared/response";
import { logger } from "@/config/logger";
import * as productsService from "./products.service";

export async function updateProduct(req: Request, res: Response) {
  const auth = req.authContext!;
  const { id } = req.params as { id: string };
  const {
    imsCode,
    name,
    categoryId,
    description,
    subCategory,
    length,
    breadth,
    height,
    weight,
    costPrice,
    mrp,
    vendorId,
    locationId,
    variations,
    discounts,
  } = req.body;

  logger.log(`[UpdateProduct] Attempting to update product with ID: ${id}`);

  try {
    const product = await productsService.updateProduct(
      auth,
      id,
      {
        imsCode,
        name,
        categoryId,
        description,
        subCategory,
        length:
          length !== undefined
            ? length
              ? parseFloat(length)
              : null
            : undefined,
        breadth:
          breadth !== undefined
            ? breadth
              ? parseFloat(breadth)
              : null
            : undefined,
        height:
          height !== undefined
            ? height
              ? parseFloat(height)
              : null
            : undefined,
        weight:
          weight !== undefined
            ? weight
              ? parseFloat(weight)
              : null
            : undefined,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        mrp: mrp !== undefined ? parseFloat(mrp) : undefined,
        vendorId,
        locationId,
        variations,
        discounts,
      },
      {
        ip:
          req.ip ??
          (req.socket as { remoteAddress?: string })?.remoteAddress ??
          undefined,
        userAgent: req.get("user-agent") ?? undefined,
      },
    );

    return ok(res, { product }, 200, "Product updated successfully");
  } catch (err: unknown) {
    const e = err as {
      code?: string;
      meta?: { target?: string[] };
      message?: string;
    };
    if (e.code === "P2002") {
      const target = e.meta?.target as string[] | undefined;
      const isImsConflict =
        !target ||
        (target.length === 2 &&
          target.some((f) => f === "imsCode" || f === "ims_code") &&
          target.some((f) => f === "tenantId" || f === "tenant_id"));
      return fail(
        res,
        isImsConflict
          ? "Product with this IMS code already exists"
          : "A duplicate value was provided (e.g. duplicate variation color).",
        409,
      );
    }
    throw err;
  }
}
