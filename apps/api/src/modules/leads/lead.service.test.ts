import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockCreate = vi.fn();
const mockFindById = vi.fn();

vi.mock("./lead.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAll: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    convertToContact: vi.fn(),
  },
}));

import { LeadService } from "./lead.service";

const leadService = new LeadService();

describe("LeadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("returns lead when found", async () => {
      const lead = { id: "l1", name: "Jane", tenantId: "t1" };
      mockFindById.mockResolvedValue(lead);

      const result = await leadService.getById("t1", "l1");
      expect(result).toEqual(lead);
    });

    it("throws 404 when lead not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(leadService.getById("t1", "missing")).rejects.toMatchObject(
        createError("Lead not found", 404),
      );
    });
  });
});
