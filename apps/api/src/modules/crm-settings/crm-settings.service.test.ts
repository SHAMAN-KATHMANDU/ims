import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindSourceByName = vi.fn();
const mockCreateSource = vi.fn();
const mockFindSourceById = vi.fn();
const mockUpdateSource = vi.fn();
const mockDeleteSource = vi.fn();
const mockFindAllSources = vi.fn();
const mockCountSources = vi.fn();
const mockFindJourneyTypeByName = vi.fn();
const mockCreateJourneyType = vi.fn();
const mockFindAllJourneyTypes = vi.fn();
const mockFindAllPipelines = vi.fn();

vi.mock("./crm-settings.repository", () => ({
  default: {
    findSourceByName: (...args: unknown[]) => mockFindSourceByName(...args),
    createSource: (...args: unknown[]) => mockCreateSource(...args),
    findSourceById: (...args: unknown[]) => mockFindSourceById(...args),
    updateSource: (...args: unknown[]) => mockUpdateSource(...args),
    deleteSource: (...args: unknown[]) => mockDeleteSource(...args),
    findAllSources: (...args: unknown[]) => mockFindAllSources(...args),
    countSources: (...args: unknown[]) => mockCountSources(...args),
    findAllJourneyTypes: (...args: unknown[]) =>
      mockFindAllJourneyTypes(...args),
    findJourneyTypeByName: (...args: unknown[]) =>
      mockFindJourneyTypeByName(...args),
    createJourneyType: (...args: unknown[]) => mockCreateJourneyType(...args),
    findJourneyTypeById: vi.fn(),
    updateJourneyType: vi.fn(),
    deleteJourneyType: vi.fn(),
  },
}));

vi.mock("../pipelines/pipeline.repository", () => ({
  default: {
    findAll: (...args: unknown[]) => mockFindAllPipelines(...args),
  },
}));

import { CrmSettingsService } from "./crm-settings.service";

const crmSettingsService = new CrmSettingsService();

describe("CrmSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllSources.mockResolvedValue([]);
    mockCountSources.mockResolvedValue(0);
    mockFindAllJourneyTypes.mockResolvedValue([]);
    mockFindAllPipelines.mockResolvedValue([]);
  });

  describe("getAllSources", () => {
    it("ensures the default Sales source exists for existing tenants", async () => {
      mockFindSourceByName.mockResolvedValueOnce(null);
      mockCreateSource.mockResolvedValue({
        id: "s-sales",
        name: "Sales",
        tenantId: "t1",
      });
      mockFindAllSources.mockResolvedValue([{ id: "s-sales", name: "Sales" }]);

      const result = await crmSettingsService.getAllSources("t1");

      expect(mockCreateSource).toHaveBeenCalledWith("t1", { name: "Sales" });
      expect(result).toEqual({
        sources: [{ id: "s-sales", name: "Sales" }],
      });
    });
  });

  describe("getAllJourneyTypes", () => {
    it("ensures pipeline names exist as journey types", async () => {
      mockFindAllPipelines.mockResolvedValue([
        { id: "p1", name: "New Sales" },
        { id: "p2", name: "Remarketing" },
      ]);
      mockFindJourneyTypeByName
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "jt2", name: "Remarketing" });
      mockCreateJourneyType.mockResolvedValue({
        id: "jt1",
        name: "New Sales",
        tenantId: "t1",
      });
      mockFindAllJourneyTypes.mockResolvedValue([
        { id: "jt1", name: "New Sales" },
        { id: "jt2", name: "Remarketing" },
      ]);

      const result = await crmSettingsService.getAllJourneyTypes("t1");

      expect(mockCreateJourneyType).toHaveBeenCalledWith("t1", {
        name: "New Sales",
      });
      expect(result).toEqual({
        journeyTypes: [
          { id: "jt1", name: "New Sales" },
          { id: "jt2", name: "Remarketing" },
        ],
      });
    });
  });

  describe("createSource", () => {
    it("creates source when name is available", async () => {
      mockFindSourceByName.mockResolvedValue(null);
      mockCreateSource.mockResolvedValue({
        id: "s1",
        name: "Website",
        tenantId: "t1",
      });

      const result = await crmSettingsService.createSource("t1", {
        name: "Website",
      });

      expect(result.name).toBe("Website");
      expect(mockCreateSource).toHaveBeenCalled();
    });

    it("throws 409 when source name already exists", async () => {
      mockFindSourceByName.mockResolvedValue({
        id: "s0",
        name: "Website",
      });

      await expect(
        crmSettingsService.createSource("t1", { name: "Website" }),
      ).rejects.toMatchObject(
        createError("A source with this name already exists", 409),
      );

      expect(mockCreateSource).not.toHaveBeenCalled();
    });
  });

  describe("updateSource", () => {
    it("throws 404 when source not found", async () => {
      mockFindSourceById.mockResolvedValue(null);

      await expect(
        crmSettingsService.updateSource("t1", "missing", { name: "Updated" }),
      ).rejects.toMatchObject(createError("Source not found", 404));

      expect(mockUpdateSource).not.toHaveBeenCalled();
    });
  });

  describe("deleteSource", () => {
    it("throws 404 when source not found", async () => {
      mockFindSourceById.mockResolvedValue(null);

      await expect(
        crmSettingsService.deleteSource("t1", "missing"),
      ).rejects.toMatchObject(createError("Source not found", 404));

      expect(mockDeleteSource).not.toHaveBeenCalled();
    });
  });
});
