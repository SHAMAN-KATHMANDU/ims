import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorReportService } from "./error-report.service";
import type { ErrorReportRepository } from "./error-report.repository";

const mockCreate = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockUpdateStatus = vi.fn();

const mockRepo = {
  create: mockCreate,
  count: mockCount,
  findMany: mockFindMany,
  updateStatus: mockUpdateStatus,
} as unknown as ErrorReportRepository;

const errorReportService = new ErrorReportService(mockRepo);

describe("ErrorReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates error report with trimmed fields", async () => {
      mockCreate.mockResolvedValue({
        id: "er1",
        title: "Test error",
        tenantId: "t1",
        userId: "u1",
      });

      const result = await errorReportService.create("t1", "u1", {
        title: "Test error",
        description: "Details",
      });

      expect(result.title).toBe("Test error");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          userId: "u1",
          title: "Test error",
        }),
      );
    });
  });

  describe("list", () => {
    it("returns paginated reports", async () => {
      mockCount.mockResolvedValue(2);
      mockFindMany.mockResolvedValue([
        { id: "er1", title: "Error 1" },
        { id: "er2", title: "Error 2" },
      ]);

      const result = await errorReportService.list("t1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });
  });

  describe("updateStatus", () => {
    it("calls repo updateStatus", async () => {
      mockUpdateStatus.mockResolvedValue({
        id: "er1",
        status: "RESOLVED",
      });

      await errorReportService.updateStatus("er1", "RESOLVED");
      expect(mockUpdateStatus).toHaveBeenCalledWith("er1", "RESOLVED");
    });
  });
});
