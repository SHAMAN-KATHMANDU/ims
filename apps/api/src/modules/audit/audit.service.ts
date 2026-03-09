import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import auditRepository, {
  type AuditRepository,
  type AuditLogWhere,
} from "./audit.repository";

export class AuditService {
  constructor(private repo: AuditRepository) {}

  async getAuditLogs(
    tenantId: string | null,
    rawQuery: Record<string, unknown>,
  ) {
    const { page, limit } = getPaginationParams(rawQuery);
    const userId =
      typeof rawQuery.userId === "string" ? rawQuery.userId : undefined;
    const action =
      typeof rawQuery.action === "string" ? rawQuery.action : undefined;
    const from = typeof rawQuery.from === "string" ? rawQuery.from : undefined;
    const to = typeof rawQuery.to === "string" ? rawQuery.to : undefined;

    const where: AuditLogWhere = {};
    if (tenantId) where.tenantId = tenantId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    if (from) {
      const fromDate = new Date(from + "T00:00:00.000Z");
      where.createdAt = { ...where.createdAt, gte: fromDate };
    }
    if (to) {
      const toDate = new Date(to + "T23:59:59.999Z");
      where.createdAt = { ...where.createdAt, lte: toDate };
    }

    const skip = (page - 1) * limit;

    const [totalItems, logs] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany({ where, skip, take: limit }),
    ]);

    return createPaginationResult(logs, totalItems, page, limit);
  }
}

export default new AuditService(auditRepository);
