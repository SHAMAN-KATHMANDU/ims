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

vi.mock("./crm-settings.repository", () => ({
  default: {
    findSourceByName: (...args: unknown[]) => mockFindSourceByName(...args),
    createSource: (...args: unknown[]) => mockCreateSource(...args),
    findSourceById: (...args: unknown[]) => mockFindSourceById(...args),
    updateSource: (...args: unknown[]) => mockUpdateSource(...args),
    deleteSource: (...args: unknown[]) => mockDeleteSource(...args),
    findAllSources: (...args: unknown[]) => mockFindAllSources(...args),
    countSources: (...args: unknown[]) => mockCountSources(...args),
    findJourneyTypeById: vi.fn(),
    updateJourneyType: vi.fn(),
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
    it("returns journey types derived from active deal context", async () => {
      mockFindDerivedJourneyTypes.mockResolvedValue([
        { id: "p1:Lead", name: "New Sales(Lead)", createdAt: "2026-04-01" },
        {
          id: "p2:Follow-up Due",
          name: "Remarketing(Follow-up Due)",
          createdAt: "2026-04-01",
        },
      ]);

      const result = await crmSettingsService.getAllJourneyTypes("t1");

      expect(mockFindDerivedJourneyTypes).toHaveBeenCalledWith("t1", undefined);
      expect(result).toEqual({
        journeyTypes: [
          { id: "p1:Lead", name: "New Sales(Lead)", createdAt: "2026-04-01" },
          {
            id: "p2:Follow-up Due",
            name: "Remarketing(Follow-up Due)",
            createdAt: "2026-04-01",
          },
        ],
      });
    });
  });

  describe("journey type mutations", () => {
    it("rejects manual create attempts", async () => {
      await expect(
        crmSettingsService.createJourneyType("t1", { name: "Manual" }),
      ).rejects.toMatchObject(
        createError(
          "Journey types are derived from the contact's active deal pipeline and stage and cannot be edited manually.",
          403,
        ),
      );
    });

    it("rejects manual update attempts", async () => {
      await expect(
        crmSettingsService.updateJourneyType("t1", "jt1", { name: "Manual" }),
      ).rejects.toMatchObject(
        createError(
          "Journey types are derived from the contact's active deal pipeline and stage and cannot be edited manually.",
          403,
        ),
      );
    });

    it("rejects manual delete attempts", async () => {
      await expect(
        crmSettingsService.deleteJourneyType("t1", "jt1"),
      ).rejects.toMatchObject(
        createError(
          "Journey types are derived from the contact's active deal pipeline and stage and cannot be edited manually.",
          403,
        ),
      );
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
