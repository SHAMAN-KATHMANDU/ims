import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockPublishDomainEvent = vi.fn();

vi.mock("./company.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAll: vi.fn(),
    update: (...args: unknown[]) => mockUpdate(...args),
    softDelete: vi.fn(),
  },
}));

vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) =>
      Promise.resolve(mockPublishDomainEvent(...args)),
  },
}));

import { CompanyService } from "./company.service";

const companyService = new CompanyService();

describe("CompanyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("publishes automation event after creating a company", async () => {
      mockCreate.mockResolvedValue({
        id: "c1",
        name: "Acme Corp",
        website: null,
        address: null,
        phone: null,
      });

      const result = await companyService.create("t1", { name: "Acme Corp" });

      expect(result).toEqual(
        expect.objectContaining({
          id: "c1",
          name: "Acme Corp",
        }),
      );
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "crm.company.created",
          entityType: "COMPANY",
          entityId: "c1",
        }),
      );
    });
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

  describe("update", () => {
    it("publishes automation event after updating a company", async () => {
      mockFindById.mockResolvedValue({ id: "c1", name: "Acme Corp" });
      mockUpdate.mockResolvedValue({
        id: "c1",
        name: "Acme Updated",
        website: null,
        address: null,
        phone: null,
        updatedAt: new Date("2024-06-15T00:00:00.000Z"),
      });

      const result = await companyService.update("t1", "c1", {
        name: "Acme Updated",
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: "c1",
          name: "Acme Updated",
        }),
      );
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "crm.company.updated",
          entityType: "COMPANY",
          entityId: "c1",
        }),
      );
    });
  });
});
