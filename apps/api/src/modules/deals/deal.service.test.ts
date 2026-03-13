import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindDefaultPipeline = vi.fn();
const mockCreate = vi.fn();
const mockFindById = vi.fn();

vi.mock("./deal.repository", () => ({
  default: {
    findDefaultPipeline: (...args: unknown[]) =>
      mockFindDefaultPipeline(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAll: vi.fn(),
    findKanban: vi.fn(),
    createDealRevision: vi.fn(),
    createDeleteRevision: vi.fn(),
    createNotification: vi.fn(),
  },
}));

import { DealService } from "./deal.service";

const dealService = new DealService();

describe("DealService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("throws 400 when no pipeline found", async () => {
      mockFindDefaultPipeline.mockResolvedValue(null);

      await expect(
        dealService.create("t1", { name: "Deal 1" }, "u1"),
      ).rejects.toMatchObject(
        createError("No pipeline found. Create a default pipeline first.", 400),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("throws 404 when deal not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(dealService.getById("t1", "missing")).rejects.toMatchObject(
        createError("Deal not found", 404),
      );
    });
  });
});
