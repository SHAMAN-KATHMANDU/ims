import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindSourceByName = vi.fn();
const mockCreateSource = vi.fn();
const mockFindSourceById = vi.fn();
const mockUpdateSource = vi.fn();
const mockDeleteSource = vi.fn();
const mockFindAllSources = vi.fn();
const mockCountSources = vi.fn();
const mockFindDerivedJourneyTypes = vi.fn();
const mockFindAllJourneyTypes = vi.fn();
const mockFindJourneyTypeByName = vi.fn();
const mockFindJourneyTypeById = vi.fn();
const mockCreateJourneyType = vi.fn();
const mockUpdateJourneyType = vi.fn();
const mockDeleteJourneyType = vi.fn();

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
    findJourneyTypeById: (...args: unknown[]) =>
      mockFindJourneyTypeById(...args),
    createJourneyType: (...args: unknown[]) => mockCreateJourneyType(...args),
    updateJourneyType: (...args: unknown[]) => mockUpdateJourneyType(...args),
    deleteJourneyType: (...args: unknown[]) => mockDeleteJourneyType(...args),
  },
}));

vi.mock("../contacts/contact.repository", () => ({
  default: {
    findDerivedJourneyTypes: (...args: unknown[]) =>
      mockFindDerivedJourneyTypes(...args),
  },
}));

import { CrmSettingsService } from "./crm-settings.service";

const crmSettingsService = new CrmSettingsService();

describe("CrmSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllSources.mockResolvedValue([]);
    mockCountSources.mockResolvedValue(0);
    mockFindDerivedJourneyTypes.mockResolvedValue([]);
    mockFindAllJourneyTypes.mockResolvedValue([]);
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
    it("merges user-managed journey types with pipeline-derived labels", async () => {
      mockFindAllJourneyTypes.mockResolvedValue([
        { id: "jt1", name: "VIP Onboarding", createdAt: "2026-03-01" },
      ]);
      mockFindDerivedJourneyTypes.mockResolvedValue([
        { id: "p1:Lead", name: "New Sales(Lead)", createdAt: "2026-04-01" },
      ]);

      const result = await crmSettingsService.getAllJourneyTypes("t1");

      expect(mockFindAllJourneyTypes).toHaveBeenCalledWith("t1");
      expect(mockFindDerivedJourneyTypes).toHaveBeenCalledWith("t1", undefined);
      // Sorted by name: "New Sales(Lead)" < "VIP Onboarding"
      expect(result.journeyTypes.map((j) => j.name)).toEqual([
        "New Sales(Lead)",
        "VIP Onboarding",
      ]);
    });

    it("prefers the stored entry over a derived one with the same name", async () => {
      mockFindAllJourneyTypes.mockResolvedValue([
        { id: "jt1", name: "New Sales(Lead)", createdAt: "2026-03-01" },
      ]);
      mockFindDerivedJourneyTypes.mockResolvedValue([
        { id: "p1:Lead", name: "New Sales(Lead)", createdAt: "2026-04-01" },
      ]);

      const result = await crmSettingsService.getAllJourneyTypes("t1");

      expect(result.journeyTypes).toEqual([
        { id: "jt1", name: "New Sales(Lead)", createdAt: "2026-03-01" },
      ]);
    });
  });

  describe("journey type mutations (now editable)", () => {
    it("creates a journey type when the name is available", async () => {
      mockFindJourneyTypeByName.mockResolvedValue(null);
      mockCreateJourneyType.mockResolvedValue({
        id: "jt1",
        name: "VIP",
        createdAt: "2026-04-01",
      });

      const result = await crmSettingsService.createJourneyType("t1", {
        name: "VIP",
      });

      expect(result.name).toBe("VIP");
      expect(mockCreateJourneyType).toHaveBeenCalledWith("t1", { name: "VIP" });
    });

    it("throws 409 when the journey type name already exists", async () => {
      mockFindJourneyTypeByName.mockResolvedValue({ id: "jt0", name: "VIP" });

      await expect(
        crmSettingsService.createJourneyType("t1", { name: "VIP" }),
      ).rejects.toMatchObject(
        createError("A journey type with this name already exists", 409),
      );
      expect(mockCreateJourneyType).not.toHaveBeenCalled();
    });

    it("throws 404 when updating a missing journey type", async () => {
      mockFindJourneyTypeById.mockResolvedValue(null);

      await expect(
        crmSettingsService.updateJourneyType("t1", "missing", { name: "X" }),
      ).rejects.toMatchObject(createError("Journey type not found", 404));
      expect(mockUpdateJourneyType).not.toHaveBeenCalled();
    });

    it("throws 404 when deleting a missing journey type", async () => {
      mockFindJourneyTypeById.mockResolvedValue(null);

      await expect(
        crmSettingsService.deleteJourneyType("t1", "missing"),
      ).rejects.toMatchObject(createError("Journey type not found", 404));
      expect(mockDeleteJourneyType).not.toHaveBeenCalled();
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
