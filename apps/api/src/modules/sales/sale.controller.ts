import { Request, Response } from "express";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import path from "path";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import {
  previewSale as previewSaleService,
  createSale as createSaleService,
  getAllSales as getAllSalesService,
  getSaleById as getSaleByIdService,
  addPayment as addPaymentService,
  getDailySales as getDailySalesService,
  downloadSales as downloadSalesService,
  getSalesSummary as getSalesSummaryService,
  getSalesByLocation as getSalesByLocationService,
  getSalesSinceLastLogin as getSalesSinceLastLoginService,
  type CreateSalePayload,
} from "./sales.service";
import {
  processSalesUpload,
  generateBulkUploadTemplate,
} from "./bulkUpload.service";

class SaleController {
  async createSale(req: Request, res: Response) {
    const auth = req.authContext!;

    const payload = req.body as CreateSalePayload;
    const sale = await createSaleService(payload, auth, {
      ip: (req as any).ip ?? (req.socket as any)?.remoteAddress,
      userAgent: req.get("user-agent") ?? undefined,
    });
    return ok(res, { sale }, 201, "Sale created successfully");
  }

  async previewSale(req: Request, res: Response) {
    const auth = req.authContext!;
    const ctx = {
      tenantId: auth.tenantId,
      locationId: req.body.locationId,
      memberPhone: req.body.memberPhone,
      memberName: req.body.memberName,
      items: req.body.items,
    };
    const result = await previewSaleService(ctx);
    return ok(res, result);
  }

  async getAllSales(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      locationId?: string;
      createdById?: string;
      type?: "GENERAL" | "MEMBER";
      isCreditSale?: boolean;
      startDate?: string;
      endDate?: string;
    }>(req, res);
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const {
      locationId,
      createdById: createdByIdParam,
      type,
      isCreditSale,
      startDate,
      endDate,
    } = query;

    const { sales, totalItems } = await getAllSalesService({
      tenantId: auth.tenantId,
      page,
      limit,
      sortBy,
      sortOrder: sortOrder as "asc" | "desc",
      search,
      locationId,
      type,
      isCreditSale,
      startDate,
      endDate,
      createdById: createdByIdParam,
      userRole: auth.role,
      userId: auth.userId,
    });

    const result = createPaginationResult(sales, totalItems, page, limit);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Sales fetched successfully",
    );
  }

  // Get current user's sales since last login (for User Sales Report)
  async getSalesSinceLastLogin(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
    }>(req, res);
    const { page, limit } = getPaginationParams(query);

    const { sales, totalItems } = await getSalesSinceLastLoginService({
      userId: auth.userId,
      page,
      limit,
    });

    const result = createPaginationResult(sales, totalItems, page, limit);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Sales since last login",
    );
  }

  async getSaleById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const sale = await getSaleByIdService(id);
    return ok(res, { sale }, 200, "Sale fetched successfully");
  }

  async addPayment(req: Request, res: Response) {
    const { id: saleId } = req.params as { id: string };
    const { method, amount } = req.body as { method: string; amount: number };
    const updatedSale = await addPaymentService({
      saleId,
      method,
      amount: Number(amount),
    });
    return ok(res, { sale: updatedSale }, 201, "Payment added successfully");
  }

  // Get sales summary for analytics
  async getSalesSummary(req: Request, res: Response) {
    const auth = req.authContext!;

    const { locationId, startDate, endDate } = getValidatedQuery<{
      locationId?: string;
      startDate?: string;
      endDate?: string;
    }>(req, res);

    const summary = await getSalesSummaryService({
      tenantId: auth.tenantId,
      locationId,
      startDate,
      endDate,
    });
    return ok(res, { summary }, 200, "Sales summary fetched successfully");
  }

  // Get sales by location (for analytics)
  async getSalesByLocation(req: Request, res: Response) {
    const auth = req.authContext!;

    const { startDate, endDate } = getValidatedQuery<{
      startDate?: string;
      endDate?: string;
    }>(req, res);

    const data = await getSalesByLocationService({
      tenantId: auth.tenantId,
      startDate,
      endDate,
    });
    return ok(res, data, 200, "Sales by location fetched successfully");
  }

  async getDailySales(req: Request, res: Response) {
    const auth = req.authContext!;

    const { locationId, days = 30 } = getValidatedQuery<{
      locationId?: string;
      days?: number;
    }>(req, res);

    const data = await getDailySalesService({
      tenantId: auth.tenantId,
      locationId,
      days,
    });
    return ok(res, data, 200, "Daily sales fetched successfully");
  }

  // Bulk upload sales from Excel or CSV file
  async bulkUploadSales(req: Request, res: Response) {
    if (!req.file) return fail(res, "No file uploaded", 400);

    const auth = req.authContext!;

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    const result = await processSalesUpload(filePath, fileExt, auth);
    return ok(res, result, 200, "Bulk upload completed");
  }

  // Download bulk upload template (headers only)
  async downloadBulkUploadTemplate(req: Request, res: Response) {
    const buffer = await generateBulkUploadTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sales_bulk_upload_template.xlsx"',
    );
    res.send(buffer);
  }

  // Download sales as Excel or CSV
  async downloadSales(req: Request, res: Response) {
    const auth = req.authContext!;

    const { format = "excel", ids: idsParam } = getValidatedQuery<{
      format?: "excel" | "csv";
      ids?: string;
    }>(req, res);

    if (format !== "excel" && format !== "csv") {
      return fail(res, "Invalid format. Supported formats: excel, csv", 400);
    }

    let saleIds: string[] | undefined;
    if (idsParam) {
      saleIds = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }

    const { buffer, contentType, filename } = await downloadSalesService({
      tenantId: auth.tenantId,
      format,
      saleIds,
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}

export default new SaleController();
