import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindSourceByName = vi.fn();
const mockCreateSource = vi.fn();
const mockFindSourceById = vi.fn();
const mockUpdateSource = vi.fn();
const mockDeleteSource = vi.fn();

vi.mock("./crm-settings.repository", () => ({
  default: {
    findSourceByName: (...args: unknown[]) => mockFindSourceByName(...args),
    createSource: (...args: unknown[]) => mockCreateSource(...args),
    findSourceById: (...args: unknown[]) => mockFindSourceById(...args),
    updateSource: (...args: unknown[]) => mockUpdateSource(...args),
    deleteSource: (...args: unknown[]) => mockDeleteSource(...args),
    findAllSources: vi.fn().mockResolvedValue([]),
    findAllJourneyTypes: vi.fn().mockResolvedValue([]),
    findJourneyTypeByName: vi.fn(),
    createJourneyType: vi.fn(),
    findJourneyTypeById: vi.fn(),
    updateJourneyType: vi.fn(),
    deleteJourneyType: vi.fn(),
  },
}));

import { CrmSettingsService } from "./crm-settings.service";

const crmSettingsService = new CrmSettingsService();

describe("CrmSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
