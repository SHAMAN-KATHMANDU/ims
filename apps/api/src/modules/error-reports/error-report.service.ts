import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import errorReportRepository, {
  type ErrorReportRepository,
  type ErrorReportWhere,
} from "./error-report.repository";
import type { CreateErrorReportDto } from "./error-report.schema";

export class ErrorReportService {
  constructor(private repo: ErrorReportRepository) {}

  async create(
    tenantId: string | null,
    userId: string,
    data: CreateErrorReportDto,
  ) {
    const title = data.title.trim().slice(0, 255);
    const description =
      data.description && typeof data.description === "string"
        ? data.description.trim().slice(0, 5000)
        : null;
    const pageUrl =
      data.pageUrl && typeof data.pageUrl === "string"
        ? data.pageUrl.trim().slice(0, 500)
        : null;

    return this.repo.create({
      tenantId,
      userId,
      title,
      description,
      pageUrl,
    });
  }

  async list(tenantId: string | null, rawQuery: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(rawQuery);
    const status =
      typeof rawQuery.status === "string" ? rawQuery.status : undefined;
    const userId =
      typeof rawQuery.userId === "string" ? rawQuery.userId : undefined;
    const from = typeof rawQuery.from === "string" ? rawQuery.from : undefined;
    const to = typeof rawQuery.to === "string" ? rawQuery.to : undefined;

    const where: ErrorReportWhere = {};
    if (tenantId) where.tenantId = tenantId;
    if (status && ["OPEN", "REVIEWED", "RESOLVED"].includes(status)) {
      where.status = status as "OPEN" | "REVIEWED" | "RESOLVED";
    }
    if (userId) where.userId = userId;
    if (from) {
      const fromDate = new Date(from + "T00:00:00.000Z");
      where.createdAt = { ...where.createdAt, gte: fromDate };
    }
    if (to) {
      const toDate = new Date(to + "T23:59:59.999Z");
      where.createdAt = { ...where.createdAt, lte: toDate };
    }

    const skip = (page - 1) * limit;

    const [totalItems, reports] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany(where, skip, limit),
    ]);

    return createPaginationResult(reports, totalItems, page, limit);
  }

  async updateStatus(id: string, status: "OPEN" | "REVIEWED" | "RESOLVED") {
    return this.repo.updateStatus(id, status);
  }
}

export default new ErrorReportService(errorReportRepository);
