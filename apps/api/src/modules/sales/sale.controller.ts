/**
 * Sale Controller — Thin HTTP layer. No Prisma.
 * Arrow methods, Zod validation, calls service.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import ExcelJS from "exceljs";
import fs from "fs";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import type { ExcelSaleRow } from "./bulkUpload.validation";
import { getSaleBulkParseOptions } from "./bulkUpload.validation";
import {
  processSaleBulkRows,
  buildSaleBulkTemplate,
} from "./sale.bulk.service";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import saleService, {
  type SaleItemInput,
  SaleCalculationError,
} from "./sale.service";
import { generateReceiptPdf } from "./receipt-pdf.service";
import { sendControllerError } from "@/utils/controllerError";
import {
  CreateSaleSchema,
  PreviewSaleSchema,
  AddPaymentSchema,
  GetAllSalesQuerySchema,
  GetSalesSummaryQuerySchema,
  GetSalesByLocationQuerySchema,
  GetDailySalesQuerySchema,
  DownloadSalesQuerySchema,
} from "./sale.schema";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleServiceError(
  req: Request,
  res: Response,
  error: unknown,
  context: string,
) {
  const err = error as { statusCode?: number; extra?: Record<string, unknown> };
  if (err.statusCode === 404) {
    return res.status(404).json({
      message: (error as Error).message ?? "Not found",
      ...err.extra,
    });
  }
  if (err.statusCode === 400) {
    return res.status(400).json({
      message: (error as Error).message ?? "Bad request",
      ...err.extra,
    });
  }
  if (error instanceof SaleCalculationError) {
    return res.status(error.status).json({
      message: error.message,
      ...error.extra,
    });
  }
  return sendControllerError(req, res, error, context);
}

class SaleController {
  createSale = async (req: Request, res: Response) => {
    try {
      const body = CreateSaleSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const sale = await saleService.createSale(
        {
          tenantId,
          userId,
          ip:
            (req as { ip?: string }).ip ??
            (req.socket as { remoteAddress?: string })?.remoteAddress,
          userAgent: req.get("user-agent") ?? undefined,
        },
        {
          locationId: body.locationId,
          memberPhone: body.memberPhone,
          memberName: body.memberName,
          contactId: body.contactId ?? undefined,
          isCreditSale: body.isCreditSale,
          items: body.items as SaleItemInput[],
          notes: body.notes,
          payments: body.payments as
            | Array<{
                method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
                amount: number;
              }>
            | undefined,
        },
      );

      return res.status(201).json({
        message: "Sale created successfully",
        sale,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleServiceError(req, res, error, "Create sale error");
    }
  };

  previewSale = async (req: Request, res: Response) => {
    try {
      const body = PreviewSaleSchema.parse(req.body);
      const result = await saleService.previewSale(
        { tenantId: req.user!.tenantId },
        {
          locationId: body.locationId,
          memberPhone: body.memberPhone,
          memberName: body.memberName,
          contactId: body.contactId ?? undefined,
          items: body.items as SaleItemInput[],
        },
      );

      return res.json({
        subtotal: result.subtotal,
        discount: result.totalDiscount,
        total: result.total,
        promoDiscount: result.totalPromoDiscount,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleServiceError(req, res, error, "Preview sale error");
    }
  };

  getAllSales = async (req: Request, res: Response) => {
    try {
      const pagination = getPaginationParams(req.query);
      const query = GetAllSalesQuerySchema.parse({
        ...req.query,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
        search: pagination.search,
      });

      const userRole = (req as { user?: { role?: string } }).user?.role;
      const userId = (req as { user?: { id?: string } }).user?.id;

      const result = await saleService.getAllSales({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        search: query.search,
        locationId: query.locationId,
        createdById: query.createdById,
        type: query.type,
        isCreditSale: query.isCreditSale,
        startDate: query.startDate,
        endDate: query.endDate,
        userRole,
        userId,
      });

      const paginated = createPaginationResult(
        result.sales,
        result.totalItems,
        result.page,
        result.limit,
      );

      return res.status(200).json({
        message: "Sales fetched successfully",
        ...paginated,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return sendControllerError(req, res, error, "Get all sales error");
    }
  };

  getSalesSinceLastLogin = async (req: Request, res: Response) => {
    try {
      const { page, limit } = getPaginationParams(req.query);
      const userId = req.user!.id;

      const result = await saleService.getSalesSinceLastLogin(userId, {
        page,
        limit,
      });
      const paginated = createPaginationResult(
        result.sales,
        result.totalItems,
        result.page,
        result.limit,
      );

      return res.status(200).json({
        message: "Sales since last login",
        ...paginated,
      });
    } catch (error) {
      return handleServiceError(
        req,
        res,
        error,
        "Get sales since last login error",
      );
    }
  };

  getSaleById = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const sale = await saleService.getSaleById(id);

      return res.status(200).json({
        message: "Sale fetched successfully",
        sale,
      });
    } catch (error) {
      return handleServiceError(req, res, error, "Get sale by ID error");
    }
  };

  getReceiptPdf = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const sale = await saleService.getSaleById(id);
      const buffer = await generateReceiptPdf(sale);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="receipt-${sale.saleCode}.pdf"`,
      );
      return res.send(buffer);
    } catch (error) {
      return handleServiceError(req, res, error, "Receipt PDF error");
    }
  };

  addPayment = async (req: Request, res: Response) => {
    try {
      const saleId = getParam(req, "id");
      const body = AddPaymentSchema.parse(req.body);

      const { sale, payment } = await saleService.addPayment(saleId, {
        method: body.method,
        amount: body.amount,
      });

      return res.status(201).json({
        message: "Payment added successfully",
        sale,
        payment,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleServiceError(req, res, error, "Add payment error");
    }
  };

  getSalesSummary = async (req: Request, res: Response) => {
    try {
      const params = GetSalesSummaryQuerySchema.parse(req.query);
      const summary = await saleService.getSalesSummary(params);

      return res.status(200).json({
        message: "Sales summary fetched successfully",
        summary,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return sendControllerError(req, res, error, "Get sales summary error");
    }
  };

  getSalesByLocation = async (req: Request, res: Response) => {
    try {
      const params = GetSalesByLocationQuerySchema.parse(req.query);
      const data = await saleService.getSalesByLocation(params);

      return res.status(200).json({
        message: "Sales by location fetched successfully",
        data,
      });
    } catch (error) {
      return sendControllerError(
        req,
        res,
        error,
        "Get sales by location error",
      );
    }
  };

  getDailySales = async (req: Request, res: Response) => {
    try {
      const params = GetDailySalesQuerySchema.parse(req.query);
      const data = await saleService.getDailySales(params);

      return res.status(200).json({
        message: "Daily sales fetched successfully",
        data,
      });
    } catch (error) {
      return sendControllerError(req, res, error, "Get daily sales error");
    }
  };

  bulkUploadSales = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          created: [],
          skipped: [],
          errors: [],
        });
      }

      let parseResult: { rows: ExcelSaleRow[]; errors: ValidationError[] };
      try {
        parseResult = await parseBulkFile<ExcelSaleRow>(
          req.file.path,
          req.file.originalname,
          getSaleBulkParseOptions(),
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

      const processResult = await processSaleBulkRows(rows, { tenantId });

      const allErrors = [...parseErrors, ...processResult.errors];

      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Error cleaning up file:", e);
      }

      const total = processResult.created.length + processResult.skipped.length;

      return res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total,
          created: processResult.created.length,
          skipped: processResult.skipped.length,
          errors: allErrors.length,
        },
        created: processResult.created,
        skipped: processResult.skipped,
        errors: allErrors,
      });
    } catch (error: unknown) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      return sendControllerError(req, res, error, "Bulk upload sales error");
    }
  };

  downloadBulkUploadTemplate = async (req: Request, res: Response) => {
    try {
      const buffer = await buildSaleBulkTemplate();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sales_bulk_upload_template.xlsx"',
      );
      res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  };

  downloadSales = async (req: Request, res: Response) => {
    try {
      const query = DownloadSalesQuerySchema.parse(req.query);
      const format = query.format;
      let saleIds: string[] | undefined;
      if (query.ids) {
        saleIds = query.ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const sales = await saleService.getSalesForExport({ ids: saleIds });

      const paymentSummary = (sale: (typeof sales)[0]) =>
        sale.payments
          .map((p) => `${p.method}: ${Number(p.amount)}`)
          .join("; ") || "N/A";

      type ExportRow = {
        saleCode: string;
        type: string;
        location: string;
        memberPhone: string;
        memberName: string;
        createdBy: string;
        date: string;
        notes: string;
        subtotal: number;
        discount: number;
        total: number;
        paymentSummary: string;
        productImsCode: string;
        productName: string;
        category: string;
        variation: string;
        quantity: number;
        unitPrice: number;
        totalMrp: number;
        discountPercent: number;
        discountAmount: number;
        lineTotal: number;
      };

      const buildRows = (): ExportRow[] => {
        const rows: ExportRow[] = [];
        for (const sale of sales) {
          const saleContext = {
            saleCode: sale.saleCode,
            type: sale.type,
            location: sale.location.name,
            memberPhone: sale.member?.phone ?? "Walk-in",
            memberName: sale.member?.name ?? "N/A",
            createdBy: sale.createdBy.username,
            date: new Date(sale.createdAt).toLocaleString(),
            notes: sale.notes ?? "N/A",
            subtotal: Number(sale.subtotal),
            discount: Number(sale.discount),
            total: Number(sale.total),
            paymentSummary: paymentSummary(sale),
          };
          if (sale.items.length === 0) {
            rows.push({
              ...saleContext,
              productImsCode: "",
              productName: "",
              category: "",
              variation: "",
              quantity: 0,
              unitPrice: 0,
              totalMrp: 0,
              discountPercent: 0,
              discountAmount: 0,
              lineTotal: 0,
            });
          } else {
            for (const item of sale.items) {
              const product = item.variation.product as {
                name: string;
                category?: { name: string };
              };
              const attrs = (
                item.variation as {
                  attributes?: Array<{
                    attributeType: { name: string };
                    attributeValue: { value: string };
                  }>;
                }
              ).attributes;
              const attrLabel =
                attrs
                  ?.map(
                    (a) => `${a.attributeType.name}: ${a.attributeValue.value}`,
                  )
                  .join(", ") || "";
              const productImsCode = item.variation.product?.imsCode ?? "";
              const variationDisplay = attrLabel
                ? `${productImsCode} (${attrLabel})`
                : productImsCode;
              rows.push({
                ...saleContext,
                productImsCode,
                productName: product.name,
                category: product.category?.name ?? "",
                variation: variationDisplay,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalMrp: Number(item.totalMrp),
                discountPercent: Number(item.discountPercent),
                discountAmount: Number(item.discountAmount),
                lineTotal: Number(item.lineTotal),
              });
            }
          }
        }
        return rows;
      };

      const exportRows = buildRows();

      const columns = [
        { header: "Sale Code", key: "saleCode", width: 20 },
        { header: "Type", key: "type", width: 12 },
        { header: "Location", key: "location", width: 25 },
        { header: "Member Phone", key: "memberPhone", width: 15 },
        { header: "Member Name", key: "memberName", width: 25 },
        { header: "Created By", key: "createdBy", width: 20 },
        { header: "Date", key: "date", width: 20 },
        { header: "Notes", key: "notes", width: 35 },
        { header: "Subtotal", key: "subtotal", width: 12 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Total", key: "total", width: 12 },
        { header: "Payment Summary", key: "paymentSummary", width: 30 },
        { header: "Product IMS Code", key: "productImsCode", width: 18 },
        { header: "Product Name", key: "productName", width: 30 },
        { header: "Category", key: "category", width: 18 },
        { header: "Attributes", key: "variation", width: 30 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit Price", key: "unitPrice", width: 12 },
        { header: "Total MRP", key: "totalMrp", width: 12 },
        { header: "Discount %", key: "discountPercent", width: 10 },
        { header: "Discount Amount", key: "discountAmount", width: 14 },
        { header: "Line Total", key: "lineTotal", width: 12 },
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales");
      worksheet.columns = columns;

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      exportRows.forEach((row) => worksheet.addRow(row));

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `sales_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

      if (format === "excel") {
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
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        const escapeCsvValue = (value: unknown): string => {
          if (value === null || value === undefined) return "";
          const str = String(value);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        const csvHeaders = columns.map((col) => col.header);
        const csvRows: string[] = [
          csvHeaders.map(escapeCsvValue).join(","),
          ...exportRows.map((row) =>
            columns
              .map((c) =>
                escapeCsvValue((row as Record<string, unknown>)[c.key]),
              )
              .join(","),
          ),
        ];
        res.send(csvRows.join("\n"));
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleServiceError(req, res, error, "Download sales error");
    }
  };
}

export default new SaleController();
