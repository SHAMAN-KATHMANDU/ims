import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPipelines,
  getPipelineById,
  getPipelineTemplates,
  createPipeline,
  updatePipeline,
  deletePipeline,
  seedPipelineFramework,
  type Pipeline,
  type PipelineStage,
} from "./pipeline.service";

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

describe("pipeline.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPipelines", () => {
    it("gets pipelines without params", async () => {
      const mockPipeline: Pipeline = {
        id: "p1",
        name: "Sales Pipeline",
        type: "GENERAL",
        stages: [
          { id: "s1", name: "Lead", order: 1 },
          { id: "s2", name: "Opportunity", order: 2 },
        ],
        isDefault: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockGet.mockResolvedValue({
        data: { pipelines: [mockPipeline] },
      });

      const result = await getPipelines();

      expect(mockGet).toHaveBeenCalledWith("/pipelines", { params: undefined });
      expect(result.pipelines).toHaveLength(1);
      expect(result.pipelines[0]!.id).toBe("p1");
    });

    it("gets pipelines with pagination and search params", async () => {
      mockGet.mockResolvedValue({
        data: {
          pipelines: [],
          pagination: {
            currentPage: 2,
            totalPages: 3,
            totalItems: 50,
            itemsPerPage: 20,
            hasNextPage: true,
            hasPrevPage: true,
          },
        },
      });

      await getPipelines({ page: 2, limit: 20, search: "sales" });

      expect(mockGet).toHaveBeenCalledWith("/pipelines", {
        params: { page: 2, limit: 20, search: "sales" },
      });
    });

    it("returns empty array for no matching pipelines", async () => {
      mockGet.mockResolvedValue({
        data: { pipelines: [] },
      });

      const result = await getPipelines({ search: "nonexistent" });

      expect(result.pipelines).toEqual([]);
    });

    it("includes pagination metadata when present", async () => {
      mockGet.mockResolvedValue({
        data: {
          pipelines: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getPipelines();

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.currentPage).toBe(1);
    });

    it("handles rejects on network error", async () => {
      const error = new Error("Network timeout");
      mockGet.mockRejectedValue(error);

      await expect(getPipelines()).rejects.toThrow("Network timeout");
    });
  });

  describe("getPipelineById", () => {
    it("gets pipeline by id with simple numeric id", async () => {
      const mockPipeline: Pipeline = {
        id: "123",
        name: "Test Pipeline",
        type: "NEW_SALES",
        stages: [],
        isDefault: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockGet.mockResolvedValue({
        data: { pipeline: mockPipeline },
      });

      const result = await getPipelineById("123");

      expect(mockGet).toHaveBeenCalledWith("/pipelines/123");
      expect(result.pipeline.id).toBe("123");
    });

    it("constructs URL correctly with UUID id", async () => {
      mockGet.mockResolvedValue({
        data: { pipeline: { id: "uuid-abc123" } },
      });

      await getPipelineById("uuid-abc123");

      expect(mockGet).toHaveBeenCalledWith("/pipelines/uuid-abc123");
    });

    it("returns pipeline with all populated fields", async () => {
      const mockPipeline: Pipeline = {
        id: "p1",
        name: "Remarketing",
        type: "REMARKETING",
        stages: [
          { id: "s1", name: "Stage 1", order: 1, color: "#FF0000" },
          { id: "s2", name: "Stage 2", order: 2, color: "#00FF00" },
        ],
        isDefault: false,
        closedWonStageName: "Won",
        closedLostStageName: "Lost",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        _count: { deals: 42 },
      };

      mockGet.mockResolvedValue({ data: { pipeline: mockPipeline } });

      const result = await getPipelineById("p1");

      expect(result.pipeline.closedWonStageName).toBe("Won");
      expect(result.pipeline.closedLostStageName).toBe("Lost");
      expect(result.pipeline._count?.deals).toBe(42);
    });

    it("rejects on pipeline not found", async () => {
      mockGet.mockRejectedValue(new Error("Pipeline not found"));

      await expect(getPipelineById("nonexistent")).rejects.toThrow(
        "Pipeline not found",
      );
    });
  });

  describe("getPipelineTemplates", () => {
    it("gets available pipeline templates", async () => {
      mockGet.mockResolvedValue({
        data: {
          message: "Templates retrieved",
          templates: [
            {
              templateId: "t1",
              name: "New Sales",
              description: "For new customer sales",
              type: "NEW_SALES",
              stageNames: ["Lead", "Qualified", "Proposal", "Won"],
              suggestAsDefault: true,
              closedWonStageName: "Won",
              closedLostStageName: "Lost",
            },
          ],
        },
      });

      const result = await getPipelineTemplates();

      expect(mockGet).toHaveBeenCalledWith("/pipelines/templates");
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0]!.type).toBe("NEW_SALES");
    });

    it("returns empty templates array when none exist", async () => {
      mockGet.mockResolvedValue({
        data: {
          message: "No templates available",
          templates: [],
        },
      });

      const result = await getPipelineTemplates();

      expect(result.templates).toEqual([]);
    });
  });

  describe("createPipeline", () => {
    it("creates pipeline with minimal required fields", async () => {
      const createdPipeline: Pipeline = {
        id: "new-p1",
        name: "New Pipeline",
        type: "GENERAL",
        stages: [],
        isDefault: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockPost.mockResolvedValue({
        data: { pipeline: createdPipeline },
      });

      const result = await createPipeline({ name: "New Pipeline" });

      expect(mockPost).toHaveBeenCalledWith("/pipelines", {
        name: "New Pipeline",
      });
      expect(result.pipeline.id).toBe("new-p1");
    });

    it("creates pipeline with all optional fields including null values", async () => {
      const stages: PipelineStage[] = [
        { id: "s1", name: "Prospect" },
        { id: "s2", name: "Customer" },
      ];

      mockPost.mockResolvedValue({
        data: {
          pipeline: {
            id: "full-p1",
            name: "Full Pipeline",
            type: "REPURCHASE",
            stages,
            isDefault: true,
            closedWonStageName: "Customer",
            closedLostStageName: null,
          },
        },
      });

      await createPipeline({
        name: "Full Pipeline",
        type: "REPURCHASE",
        stages,
        isDefault: true,
        closedWonStageName: "Customer",
        closedLostStageName: null,
      });

      expect(mockPost).toHaveBeenCalledWith("/pipelines", {
        name: "Full Pipeline",
        type: "REPURCHASE",
        stages,
        isDefault: true,
        closedWonStageName: "Customer",
        closedLostStageName: null,
      });
    });

    it("rejects when name is missing", async () => {
      mockPost.mockRejectedValue(
        new Error("Name is required for creating a pipeline"),
      );

      await expect(
        createPipeline({ name: "" } as unknown as Parameters<
          typeof createPipeline
        >[0]),
      ).rejects.toThrow();
    });
  });

  describe("updatePipeline", () => {
    it("updates pipeline with single field", async () => {
      mockPut.mockResolvedValue({
        data: {
          pipeline: {
            id: "p1",
            name: "Updated Name",
            type: "GENERAL",
            stages: [],
            isDefault: true,
          },
        },
      });

      await updatePipeline("p1", { name: "Updated Name" });

      expect(mockPut).toHaveBeenCalledWith("/pipelines/p1", {
        name: "Updated Name",
      });
    });

    it("updates pipeline with multiple fields", async () => {
      const stages: PipelineStage[] = [
        { id: "new-s1", name: "New Stage 1" },
        { id: "new-s2", name: "New Stage 2" },
      ];

      mockPut.mockResolvedValue({
        data: {
          pipeline: {
            id: "p2",
            name: "Multi Update",
            type: "REMARKETING",
            stages,
            isDefault: false,
            closedWonStageName: "Stage 2",
          },
        },
      });

      await updatePipeline("p2", {
        name: "Multi Update",
        stages,
        closedWonStageName: "Stage 2",
      });

      expect(mockPut).toHaveBeenCalledWith("/pipelines/p2", {
        name: "Multi Update",
        stages,
        closedWonStageName: "Stage 2",
      });
    });

    it("updates pipeline clearing closed stage names with null", async () => {
      mockPut.mockResolvedValue({
        data: {
          pipeline: {
            id: "p3",
            name: "Cleared Stages",
            type: "GENERAL",
            stages: [],
            isDefault: false,
            closedWonStageName: null,
            closedLostStageName: null,
          },
        },
      });

      await updatePipeline("p3", {
        closedWonStageName: null,
        closedLostStageName: null,
      });

      expect(mockPut).toHaveBeenCalledWith("/pipelines/p3", {
        closedWonStageName: null,
        closedLostStageName: null,
      });
    });

    it("rejects when update fails", async () => {
      mockPut.mockRejectedValue(new Error("Pipeline not found"));

      await expect(
        updatePipeline("nonexistent", { name: "Test" }),
      ).rejects.toThrow("Pipeline not found");
    });
  });

  describe("deletePipeline", () => {
    it("deletes pipeline by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deletePipeline("p1");

      expect(mockDelete).toHaveBeenCalledWith("/pipelines/p1");
    });

    it("deletes pipeline with UUID id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deletePipeline("uuid-12345abc");

      expect(mockDelete).toHaveBeenCalledWith("/pipelines/uuid-12345abc");
    });

    it("rejects when trying to delete nonexistent pipeline", async () => {
      mockDelete.mockRejectedValue(new Error("Pipeline not found"));

      await expect(deletePipeline("nonexistent")).rejects.toThrow(
        "Pipeline not found",
      );
    });
  });

  describe("seedPipelineFramework", () => {
    it("seeds pipeline framework and returns created resources", async () => {
      mockPost.mockResolvedValue({
        data: {
          pipelines: [
            { id: "p1", name: "General", type: "GENERAL" },
            { id: "p2", name: "New Sales", type: "NEW_SALES" },
          ],
          journeyTypes: ["standard", "custom"],
          tags: ["urgent", "follow-up"],
        },
      });

      const result = await seedPipelineFramework();

      expect(mockPost).toHaveBeenCalledWith("/pipelines/seed-framework");
      expect(result.pipelines).toHaveLength(2);
      expect(result.journeyTypes).toEqual(["standard", "custom"]);
      expect(result.tags).toEqual(["urgent", "follow-up"]);
    });

    it("handles empty seed result", async () => {
      mockPost.mockResolvedValue({
        data: {
          pipelines: [],
          journeyTypes: [],
          tags: [],
        },
      });

      const result = await seedPipelineFramework();

      expect(result.pipelines).toEqual([]);
      expect(result.journeyTypes).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it("rejects on seed failure", async () => {
      mockPost.mockRejectedValue(new Error("Seeding failed"));

      await expect(seedPipelineFramework()).rejects.toThrow("Seeding failed");
    });
  });

  describe("edge cases and integration scenarios", () => {
    it("handles pipeline with no stages", async () => {
      mockGet.mockResolvedValue({
        data: {
          pipeline: {
            id: "empty-stages",
            name: "No Stages Pipeline",
            type: "GENERAL",
            stages: [],
            isDefault: false,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await getPipelineById("empty-stages");

      expect(result.pipeline.stages).toEqual([]);
    });

    it("handles stage with all optional color field", async () => {
      const stagesWithColors: PipelineStage[] = [
        { id: "s1", name: "Cold", order: 1, color: "#FF0000" },
        { id: "s2", name: "Warm", order: 2, color: "#FFFF00" },
        { id: "s3", name: "Hot", order: 3, color: "#00FF00" },
      ];

      mockPost.mockResolvedValue({
        data: {
          pipeline: {
            id: "colored",
            name: "Colored Pipeline",
            type: "GENERAL",
            stages: stagesWithColors,
            isDefault: false,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      await createPipeline({
        name: "Colored Pipeline",
        stages: stagesWithColors,
      });

      expect(mockPost).toHaveBeenCalled();
    });

    it("handles all pipeline types", async () => {
      const types = ["GENERAL", "NEW_SALES", "REMARKETING", "REPURCHASE"];

      for (const type of types) {
        mockPost.mockResolvedValueOnce({
          data: {
            pipeline: {
              id: `p-${type}`,
              name: `${type} Pipeline`,
              type,
              stages: [],
              isDefault: false,
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
          },
        });

        const result = await createPipeline({
          name: `${type} Pipeline`,
          type: type as unknown as Parameters<typeof createPipeline>[0]["type"],
        });

        expect(result.pipeline.type).toBe(type);
      }
    });

    it("maintains pipeline count in response metadata", async () => {
      mockGet.mockResolvedValue({
        data: {
          pipeline: {
            id: "p-with-count",
            name: "Pipeline with Deals",
            type: "GENERAL",
            stages: [],
            isDefault: false,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            _count: { deals: 15 },
          },
        },
      });

      const result = await getPipelineById("p-with-count");

      expect(result.pipeline._count?.deals).toBe(15);
    });
  });
});
