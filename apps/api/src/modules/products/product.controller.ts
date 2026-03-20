import { Request, Response } from "express";
import { ZodError } from "zod";
import ExcelJS from "exceljs";
import fs from "fs";
import type { AppError } from "@/middlewares/errorHandler";
import {
  processProductBulkRows,
  buildProductBulkTemplate,
} from "./product.bulk.service";
import productService from "./product.service";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateDiscountTypeSchema,
  UpdateDiscountTypeSchema,
  GetAllProductsQuerySchema,
  GetProductByImsQuerySchema,
  DownloadProductsQuerySchema,
  GetListQuerySchema,
  GetProductDiscountsListQuerySchema,
  getProductBulkParseOptions,
} from "./product.schema";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import { logger } from "@/config/logger";
import { sendControllerError } from "@/utils/controllerError";

function getReqMeta(req: Request) {
  return {
    ip:
      (req as { ip?: string }).ip ??
      (req.socket as { remoteAddress?: string })?.remoteAddress,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

class ProductController {
  constructor(private service: typeof productService) {}

  createProduct = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = CreateProductSchema.parse(req.body);
      const { ip, userAgent } = getReqMeta(req);

      const product = await this.service.create(body, {
        tenantId,
        userId,
        ip,
        userAgent,
      });

      return res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError & {
        providedCategoryId?: string;
        providedVendorId?: string;
        providedDiscountTypeId?: string;
        existing?: string[];
      };
      if (appErr.statusCode === 404) {
        const payload: Record<string, unknown> = { message: appErr.message };
        if (appErr.providedCategoryId)
          payload.providedCategoryId = appErr.providedCategoryId;
        if (appErr.providedVendorId)
          payload.providedVendorId = appErr.providedVendorId;
        if (appErr.providedDiscountTypeId)
          payload.providedDiscountTypeId = appErr.providedDiscountTypeId;
        if (appErr.existing) payload.existing = appErr.existing;
        return res.status(404).json(payload);
      }
      if (appErr.statusCode === 409) {
        const payload: Record<string, unknown> = { message: appErr.message };
        if (appErr.existing) payload.existing = appErr.existing;
        return res.status(409).json(payload);
      }
      if (appErr.statusCode === 400)
        return res.status(400).json({ message: appErr.message });
      return sendControllerError(req, res, error, "Create product error");
    }
  };

  getAllProducts = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const params = GetAllProductsQuerySchema.parse(req.query);

      const result = await this.service.findAll(tenantId, {
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: params.search,
        locationId: params.locationId,
        categoryId: params.categoryId,
        subCategoryId: params.subCategoryId,
        subCategory: params.subCategory,
        vendorId: params.vendorId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        lowStock: params.lowStock,
      });

      return res.status(200).json({
        message: "Products fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get all products error");
    }
  };

  getProductById = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const product = await this.service.findById(id);
      return res.status(200).json({
        message: "Product fetched successfully",
        product,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Get product by ID error");
    }
  };

  getProductByIms = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = GetProductByImsQuerySchema.parse(req.query);
      const product = await this.service.getByImsCode(tenantId, {
        imsCode: query.imsCode,
        locationId: query.locationId,
      });
      return res.status(200).json({
        message: "Product fetched successfully",
        product,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get product by product code error",
      );
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = UpdateProductSchema.parse(req.body);
      const { ip, userAgent } = getReqMeta(req);

      const product = await this.service.update(id, body, {
        tenantId,
        userId,
        ip,
        userAgent,
      });

      return res.status(200).json({
        message: "Product updated successfully",
        product,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError & {
        productId?: string;
        providedVendorId?: string;
        providedDiscountTypeId?: string;
      };
      if (appErr.statusCode === 404) {
        const payload: Record<string, unknown> = { message: appErr.message };
        if (appErr.productId) payload.productId = appErr.productId;
        if (appErr.providedVendorId)
          payload.providedVendorId = appErr.providedVendorId;
        if (appErr.providedDiscountTypeId)
          payload.providedDiscountTypeId = appErr.providedDiscountTypeId;
        return res.status(404).json(payload);
      }
      if (appErr.statusCode === 409)
        return res.status(409).json({ message: appErr.message });
      return sendControllerError(req, res, error, "Update product error");
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await this.service.delete(id, {
        userId,
        tenantId,
        reason: body.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Delete product error");
    }
  };

  deleteVariation = async (req: Request, res: Response) => {
    try {
      const productId = Array.isArray(req.params.productId)
        ? req.params.productId[0]
        : req.params.productId;
      const variationId = Array.isArray(req.params.variationId)
        ? req.params.variationId[0]
        : req.params.variationId;
      const tenantId = req.user!.tenantId;

      await this.service.deleteVariation(productId, variationId, tenantId);
      return res
        .status(200)
        .json({ message: "Variation deleted successfully" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404)
        return res.status(404).json({ message: appErr.message });
      if (appErr.statusCode === 409)
        return res.status(409).json({ message: appErr.message });
      if (appErr.statusCode === 400)
        return res.status(400).json({ message: appErr.message });
      return sendControllerError(req, res, error, "Delete variation error");
    }
  };

  getAllCategories = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = GetListQuerySchema.parse(req.query);
      const result = await this.service.findAllCategories(tenantId, query);
      return res.status(200).json({
        message: "Categories fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get categories error");
    }
  };

  getAllDiscountTypes = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = GetListQuerySchema.parse(req.query);
      const result = await this.service.findAllDiscountTypes(tenantId, query);
      return res.status(200).json({
        message: "Discount types fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get discount types error");
    }
  };

  createDiscountType = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateDiscountTypeSchema.parse(req.body);
      const discountType = await this.service.createDiscountType(
        tenantId,
        body,
      );
      return res.status(201).json({
        message: "Discount type created successfully",
        discountType,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError & { existingId?: string };
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          existingId: appErr.existingId,
        });
      }
      return sendControllerError(req, res, error, "Create discount type error");
    }
  };

  updateDiscountType = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateDiscountTypeSchema.parse(req.body);
      const discountType = await this.service.updateDiscountType(
        id,
        tenantId,
        body,
      );
      return res.status(200).json({
        message: "Discount type updated successfully",
        discountType,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({
          message: appErr.message,
          discountTypeId: id,
        });
      }
      if (appErr.statusCode === 409)
        return res.status(409).json({ message: appErr.message });
      return sendControllerError(req, res, error, "Update discount type error");
    }
  };

  deleteDiscountType = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const tenantId = req.user!.tenantId;
      await this.service.deleteDiscountType(id, tenantId);
      return res.status(200).json({
        message: "Discount type deleted successfully",
        discountTypeId: id,
      });
    } catch (error: unknown) {
      const appErr = error as AppError & {
        discountTypeId?: string;
        productDiscountsCount?: number;
      };
      if (appErr.statusCode === 404) {
        return res.status(404).json({
          message: appErr.message,
          discountTypeId: appErr.discountTypeId ?? id,
        });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({
          message: appErr.message,
          productDiscountsCount: appErr.productDiscountsCount,
        });
      }
      return sendControllerError(req, res, error, "Delete discount type error");
    }
  };

  getAllProductDiscounts = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = GetProductDiscountsListQuerySchema.parse(req.query);
      const result = await this.service.findAllProductDiscounts(
        tenantId,
        query,
      );
      return res.status(200).json({
        message: "Product discounts fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get all product discounts error",
      );
    }
  };

  getProductDiscounts = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      const discounts = await this.service.getProductDiscounts(id, tenantId);
      return res.status(200).json({
        message: "Product discounts fetched successfully",
        discounts,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get product discounts error",
      );
    }
  };

  bulkUploadProducts = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          errors: [],
        });
      }

      let parseResult: {
        rows: import("./bulkUpload.validation").ExcelProductRow[];
        errors: ValidationError[];
      };
      try {
        parseResult = await parseBulkFile(
          req.file.path,
          req.file.originalname,
          getProductBulkParseOptions(),
        );
      } catch (err: unknown) {
        const e = err as { status?: number; body?: unknown };
        if (e?.status != null && e?.body != null) {
          return res.status(e.status).json(e.body);
        }
        throw err;
      }

      const { rows, errors: parseErrors } = parseResult;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const processResult = await processProductBulkRows(rows, {
        tenantId,
        userId,
      });

      const allErrors = [...parseErrors, ...processResult.errors];

      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error(
          "Error cleaning up file",
          (req as { requestId?: string }).requestId,
          cleanupError,
        );
      }

      const totalGroups =
        processResult.created.length +
        processResult.updated.length +
        processResult.skipped.length;

      return res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: totalGroups,
          created: processResult.created.length,
          updated: processResult.updated.length,
          skipped: processResult.skipped.length,
          errors: allErrors.length,
        },
        created: processResult.created,
        updated: processResult.updated,
        skipped: processResult.skipped,
        errors: allErrors,
      });
    } catch (error: unknown) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logger.error(
            "Error cleaning up file",
            (req as { requestId?: string }).requestId,
            cleanupError,
          );
        }
      }
      return sendControllerError(req, res, error, "Bulk upload error");
    }
  };

  downloadBulkUploadTemplate = async (req: Request, res: Response) => {
    try {
      const buffer = await buildProductBulkTemplate();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="products_bulk_upload_template.xlsx"',
      );
      res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  };

  downloadProducts = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const query = DownloadProductsQuerySchema.parse(req.query);
      const { format, ids: productIds, ...filters } = query;

      const products = await this.service.getProductsForExport(tenantId, {
        ids: productIds,
        ...filters,
      });

      const columns = [
        { header: "Product Code", key: "imsCode", width: 15 },
        { header: "Product Name", key: "name", width: 30 },
        { header: "Category", key: "category", width: 20 },
        { header: "Description", key: "description", width: 40 },
        { header: "Cost Price", key: "costPrice", width: 15 },
        { header: "MRP", key: "mrp", width: 15 },
        { header: "Length (cm)", key: "length", width: 15 },
        { header: "Breadth (cm)", key: "breadth", width: 15 },
        { header: "Height (cm)", key: "height", width: 15 },
        { header: "Weight (kg)", key: "weight", width: 15 },
        { header: "Total Stock", key: "totalStock", width: 15 },
        { header: "Variations", key: "variations", width: 40 },
        { header: "Discounts", key: "discounts", width: 40 },
      ];

      const escapeCsvValue = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rowsData = products.map((product) => {
        const totalStock = product.variations.reduce(
          (sum, v) => sum + (v.stockQuantity || 0),
          0,
        );
        const variationsStr =
          product.variations.length > 0
            ? product.variations
                .map((v, i) => `Variation ${i + 1} (${v.stockQuantity})`)
                .join("; ")
            : "No variations";
        const discountsStr =
          product.discounts && product.discounts.length > 0
            ? product.discounts
                .filter((d) => d.isActive)
                .map(
                  (d) =>
                    `${d.discountType?.name || "Unknown"}: ${d.discountPercentage}%`,
                )
                .join("; ")
            : "No discounts";
        return {
          imsCode: product.imsCode ?? "",
          name: product.name,
          category: product.category?.name || "N/A",
          description: product.description || "N/A",
          costPrice: product.costPrice,
          mrp: product.mrp,
          length: product.length || "N/A",
          breadth: product.breadth || "N/A",
          height: product.height || "N/A",
          weight: product.weight || "N/A",
          totalStock,
          variations: variationsStr,
          discounts: discountsStr,
        };
      });

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `products_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Products");
        worksheet.columns = columns;
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        rowsData.forEach((row) => worksheet.addRow(row));

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      } else {
        const csvRows: string[] = [];
        csvRows.push(
          columns.map((col) => escapeCsvValue(col.header)).join(","),
        );
        rowsData.forEach((row) => {
          csvRows.push(
            columns
              .map((col) =>
                escapeCsvValue((row as Record<string, unknown>)[col.key]),
              )
              .join(","),
          );
        });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        res.send(csvRows.join("\n"));
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Download products error");
    }
  };
}

export default new ProductController(productService);
