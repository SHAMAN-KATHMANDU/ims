import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuditLogs } from "./audit.service";

const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("audit.service", () => {
  describe("getAuditLogs", () => {
    it("calls GET /audit-logs with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      await getAuditLogs({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/audit-logs"),
      );
    });
  });
});
