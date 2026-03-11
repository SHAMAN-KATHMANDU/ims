import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockCreate = vi.fn();
const mockFindById = vi.fn();

vi.mock("./company.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAll: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

import { CompanyService } from "./company.service";

const companyService = new CompanyService();

describe("CompanyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("returns company when found", async () => {
      const company = { id: "c1", name: "Acme Corp", tenantId: "t1" };
      mockFindById.mockResolvedValue(company);

      const result = await companyService.getById("t1", "c1");
      expect(result).toEqual(company);
    });

    it("throws 404 when company not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        companyService.getById("t1", "missing"),
      ).rejects.toMatchObject(createError("Company not found", 404));
    });
  });
});
