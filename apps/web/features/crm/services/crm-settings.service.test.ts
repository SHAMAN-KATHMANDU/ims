import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCrmSources,
  createCrmSource,
  updateCrmSource,
  deleteCrmSource,
  getCrmJourneyTypes,
  createCrmJourneyType,
  updateCrmJourneyType,
  deleteCrmJourneyType,
  type CrmSource,
  type CrmJourneyType,
} from "./crm-settings.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("crm-settings.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Sources Tests ────────────────────────────────────────────────────────

  describe("getCrmSources", () => {
    it("gets sources with all pagination params", async () => {
      const mockSources = [
        {
          id: "src1",
          name: "Salesforce",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      mockGet.mockResolvedValue({
        data: {
          sources: mockSources,
          pagination: { page: 1, limit: 10, total: 1 },
        },
      });

      const result = await getCrmSources({
        page: 1,
        limit: 10,
        search: "Salesforce",
      });

      expect(mockGet).toHaveBeenCalledWith("/crm-settings/sources", {
        params: { page: 1, limit: 10, search: "Salesforce" },
      });
      expect(result.sources).toEqual(mockSources);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1 });
    });

    it("gets sources without optional params (undefined)", async () => {
      mockGet.mockResolvedValue({
        data: {
          sources: [],
          pagination: undefined,
        },
      });

      const result = await getCrmSources();

      expect(mockGet).toHaveBeenCalledWith("/crm-settings/sources", {
        params: undefined,
      });
      expect(result.sources).toEqual([]);
      expect(result.pagination).toBeUndefined();
    });

    it("gets sources with empty array response", async () => {
      mockGet.mockResolvedValue({
        data: {
          sources: [],
        },
      });

      const result = await getCrmSources({ page: 2, limit: 20 });

      expect(result.sources).toEqual([]);
      expect(mockGet).toHaveBeenCalled();
    });

    it("rejects when network error occurs on getCrmSources", async () => {
      const error = new Error("Network timeout");
      mockGet.mockRejectedValue(error);

      await expect(getCrmSources()).rejects.toThrow("Network timeout");
      expect(mockGet).toHaveBeenCalledWith("/crm-settings/sources", {
        params: undefined,
      });
    });
  });

  describe("createCrmSource", () => {
    it("creates source with name", async () => {
      const newSource: CrmSource = {
        id: "src-new",
        name: "HubSpot",
        createdAt: "2024-06-19T00:00:00Z",
      };
      mockPost.mockResolvedValue({
        data: { source: newSource },
      });

      const result = await createCrmSource("HubSpot");

      expect(mockPost).toHaveBeenCalledWith("/crm-settings/sources", {
        name: "HubSpot",
      });
      expect(result.source).toEqual(newSource);
    });

    it("handles empty source creation response", async () => {
      const newSource: CrmSource = {
        id: "",
        name: "",
        createdAt: "",
      };
      mockPost.mockResolvedValue({
        data: { source: newSource },
      });

      const result = await createCrmSource("");

      expect(result.source.id).toEqual("");
      expect(result.source.name).toEqual("");
    });

    it("rejects when POST fails on createCrmSource", async () => {
      const error = new Error("Validation failed");
      mockPost.mockRejectedValue(error);

      await expect(createCrmSource("Invalid")).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  describe("updateCrmSource", () => {
    it("updates source with id and new name", async () => {
      const updatedSource: CrmSource = {
        id: "src1",
        name: "Updated Salesforce",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPut.mockResolvedValue({
        data: { source: updatedSource },
      });

      const result = await updateCrmSource("src1", "Updated Salesforce");

      expect(mockPut).toHaveBeenCalledWith("/crm-settings/sources/src1", {
        name: "Updated Salesforce",
      });
      expect(result.source).toEqual(updatedSource);
    });

    it("builds correct URL with special characters in id", async () => {
      const specialId = "src-123_abc";
      mockPut.mockResolvedValue({
        data: { source: { id: specialId, name: "Special", createdAt: "" } },
      });

      await updateCrmSource(specialId, "Special");

      expect(mockPut).toHaveBeenCalledWith(
        `/crm-settings/sources/${specialId}`,
        { name: "Special" },
      );
    });

    it("rejects when PUT fails on updateCrmSource", async () => {
      const error = new Error("Source not found");
      mockPut.mockRejectedValue(error);

      await expect(updateCrmSource("invalid-id", "New Name")).rejects.toThrow(
        "Source not found",
      );
    });
  });

  describe("deleteCrmSource", () => {
    it("deletes source by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteCrmSource("src1");

      expect(mockDelete).toHaveBeenCalledWith("/crm-settings/sources/src1");
    });

    it("constructs correct URL for deletion with id", async () => {
      const sourceId = "src-to-delete";
      mockDelete.mockResolvedValue(undefined);

      await deleteCrmSource(sourceId);

      expect(mockDelete).toHaveBeenCalledWith(
        `/crm-settings/sources/${sourceId}`,
      );
    });

    it("rejects when DELETE fails on deleteCrmSource", async () => {
      const error = new Error("Permission denied");
      mockDelete.mockRejectedValue(error);

      await expect(deleteCrmSource("src1")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  // ── Journey Types Tests ──────────────────────────────────────────────────

  describe("getCrmJourneyTypes", () => {
    it("gets journey types with all pagination params", async () => {
      const mockJourneyTypes = [
        {
          id: "jt1",
          name: "Sales Journey",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "jt2",
          name: "Support Journey",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];
      mockGet.mockResolvedValue({
        data: {
          journeyTypes: mockJourneyTypes,
          pagination: { page: 1, limit: 20, total: 2 },
        },
      });

      const result = await getCrmJourneyTypes({
        page: 1,
        limit: 20,
        search: "Journey",
      });

      expect(mockGet).toHaveBeenCalledWith("/crm-settings/journey-types", {
        params: { page: 1, limit: 20, search: "Journey" },
      });
      expect(result.journeyTypes).toEqual(mockJourneyTypes);
      expect(result.journeyTypes).toHaveLength(2);
    });

    it("gets journey types without optional params", async () => {
      mockGet.mockResolvedValue({
        data: {
          journeyTypes: [],
        },
      });

      const result = await getCrmJourneyTypes();

      expect(mockGet).toHaveBeenCalledWith("/crm-settings/journey-types", {
        params: undefined,
      });
      expect(result.journeyTypes).toEqual([]);
    });

    it("gets journey types with pagination but no search", async () => {
      const mockJourneyTypes = [
        {
          id: "jt1",
          name: "Sales",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];
      mockGet.mockResolvedValue({
        data: {
          journeyTypes: mockJourneyTypes,
          pagination: { page: 2, limit: 10, total: 15 },
        },
      });

      const result = await getCrmJourneyTypes({ page: 2, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith("/crm-settings/journey-types", {
        params: { page: 2, limit: 10 },
      });
      expect(result.journeyTypes).toHaveLength(1);
      expect(result.pagination?.page).toEqual(2);
    });

    it("rejects when network error occurs on getCrmJourneyTypes", async () => {
      const error = new Error("Server error");
      mockGet.mockRejectedValue(error);

      await expect(getCrmJourneyTypes()).rejects.toThrow("Server error");
    });
  });

  describe("createCrmJourneyType", () => {
    it("creates journey type with name", async () => {
      const newJourneyType: CrmJourneyType = {
        id: "jt-new",
        name: "Onboarding Journey",
        createdAt: "2024-06-19T00:00:00Z",
      };
      mockPost.mockResolvedValue({
        data: { journeyType: newJourneyType },
      });

      const result = await createCrmJourneyType("Onboarding Journey");

      expect(mockPost).toHaveBeenCalledWith("/crm-settings/journey-types", {
        name: "Onboarding Journey",
      });
      expect(result.journeyType).toEqual(newJourneyType);
      expect(result.journeyType.name).toEqual("Onboarding Journey");
    });

    it("rejects when POST fails on createCrmJourneyType", async () => {
      const error = new Error("Journey type already exists");
      mockPost.mockRejectedValue(error);

      await expect(createCrmJourneyType("Duplicate")).rejects.toThrow(
        "Journey type already exists",
      );
    });
  });

  describe("updateCrmJourneyType", () => {
    it("updates journey type with id and new name", async () => {
      const updatedJourneyType: CrmJourneyType = {
        id: "jt1",
        name: "Updated Sales Journey",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPut.mockResolvedValue({
        data: { journeyType: updatedJourneyType },
      });

      const result = await updateCrmJourneyType("jt1", "Updated Sales Journey");

      expect(mockPut).toHaveBeenCalledWith("/crm-settings/journey-types/jt1", {
        name: "Updated Sales Journey",
      });
      expect(result.journeyType).toEqual(updatedJourneyType);
    });

    it("constructs correct URL with complex id", async () => {
      const complexId = "jt-sales_2024-01";
      mockPut.mockResolvedValue({
        data: {
          journeyType: {
            id: complexId,
            name: "New Name",
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      await updateCrmJourneyType(complexId, "New Name");

      expect(mockPut).toHaveBeenCalledWith(
        `/crm-settings/journey-types/${complexId}`,
        { name: "New Name" },
      );
    });

    it("rejects when PUT fails on updateCrmJourneyType", async () => {
      const error = new Error("Journey type not found");
      mockPut.mockRejectedValue(error);

      await expect(
        updateCrmJourneyType("invalid-id", "New Name"),
      ).rejects.toThrow("Journey type not found");
    });
  });

  describe("deleteCrmJourneyType", () => {
    it("deletes journey type by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteCrmJourneyType("jt1");

      expect(mockDelete).toHaveBeenCalledWith(
        "/crm-settings/journey-types/jt1",
      );
    });

    it("constructs correct URL for deletion with complex id", async () => {
      const journeyTypeId = "jt-special_id-123";
      mockDelete.mockResolvedValue(undefined);

      await deleteCrmJourneyType(journeyTypeId);

      expect(mockDelete).toHaveBeenCalledWith(
        `/crm-settings/journey-types/${journeyTypeId}`,
      );
    });

    it("rejects when DELETE fails on deleteCrmJourneyType", async () => {
      const error = new Error("Cannot delete: journey type in use");
      mockDelete.mockRejectedValue(error);

      await expect(deleteCrmJourneyType("jt1")).rejects.toThrow(
        "Cannot delete: journey type in use",
      );
    });
  });

  // ── Cross-Service Tests ──────────────────────────────────────────────────

  describe("sources vs journey types isolation", () => {
    it("sources and journey types use separate endpoints", async () => {
      mockGet.mockResolvedValueOnce({
        data: { sources: [] },
      });
      mockGet.mockResolvedValueOnce({
        data: { journeyTypes: [] },
      });

      await getCrmSources({ page: 1 });
      await getCrmJourneyTypes({ page: 1 });

      expect(mockGet).toHaveBeenNthCalledWith(1, "/crm-settings/sources", {
        params: { page: 1 },
      });
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        "/crm-settings/journey-types",
        { params: { page: 1 } },
      );
    });
  });

  describe("response unwrapping", () => {
    it("unwraps nested source object in response", async () => {
      const source: CrmSource = {
        id: "src1",
        name: "Test",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPost.mockResolvedValue({
        data: { source },
        status: 201,
      });

      const result = await createCrmSource("Test");

      expect(result).toHaveProperty("source");
      expect(result.source).toEqual(source);
      expect(result).not.toHaveProperty("status");
    });

    it("unwraps nested journeyType object in response", async () => {
      const journeyType: CrmJourneyType = {
        id: "jt1",
        name: "Test Journey",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockPost.mockResolvedValue({
        data: { journeyType },
        status: 201,
      });

      const result = await createCrmJourneyType("Test Journey");

      expect(result).toHaveProperty("journeyType");
      expect(result.journeyType).toEqual(journeyType);
      expect(result).not.toHaveProperty("status");
    });

    it("returns full response for getCrmSources with pagination", async () => {
      mockGet.mockResolvedValue({
        data: {
          sources: [{ id: "src1", name: "Test", createdAt: "" }],
          pagination: { page: 1, limit: 10, total: 1 },
        },
      });

      const result = await getCrmSources();

      expect(result).toHaveProperty("sources");
      expect(result).toHaveProperty("pagination");
      expect(result.pagination?.page).toEqual(1);
    });
  });
});
