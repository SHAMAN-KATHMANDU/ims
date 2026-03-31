import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindDefaultPipeline = vi.fn();
const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockCreateDealRevision = vi.fn();
const mockExecuteWorkflowRules = vi.fn().mockResolvedValue(undefined);
const mockUpdateContactByWorkflow = vi.fn();

vi.mock("@/modules/workflows/workflow.engine", () => ({
  executeWorkflowRules: (...args: unknown[]) =>
    mockExecuteWorkflowRules(...args),
}));

vi.mock("@/modules/pipeline-transitions/pipeline-transition.service", () => ({
  default: { handleDealEvent: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("./deal.repository", () => ({
  default: {
    findDefaultPipeline: (...args: unknown[]) =>
      mockFindDefaultPipeline(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    getPipelineClosingStageNames: vi.fn().mockResolvedValue(null),
    findAll: vi.fn(),
    findKanban: vi.fn(),
    createDealRevision: (...args: unknown[]) => mockCreateDealRevision(...args),
    createDeleteRevision: vi.fn(),
    createNotification: vi.fn(),
  },
}));

vi.mock("@/modules/contacts/contact.repository", () => ({
  default: {
    updateContactByWorkflow: (...args: unknown[]) =>
      mockUpdateContactByWorkflow(...args),
    incrementPurchaseCount: vi.fn(),
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

    it("syncs contact journey type to the selected pipeline name", async () => {
      mockFindDefaultPipeline.mockResolvedValue({
        id: "p1",
        name: "New Sales",
        stages: [{ id: "st1", name: "Lead", probability: 10 }],
      });
      mockCreate.mockResolvedValue({
        ...baseDealRow,
        contactId: "c1",
      });

      await dealService.create(
        "t1",
        { name: "Deal 1", contactId: "c1", pipelineId: "p1" },
        "u1",
      );

      expect(mockUpdateContactByWorkflow).toHaveBeenCalledWith("t1", "c1", {
        journeyType: "New Sales",
      });
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

  const baseDealRow = {
    id: "d1",
    tenantId: "t1",
    pipelineId: "p1",
    stage: "Lead",
    assignedToId: "u1",
    createdById: "u1",
    status: "OPEN" as const,
    contactId: null as string | null,
    memberId: null as string | null,
  };

  describe("updateStage", () => {
    it("returns existing deal without revision when same pipeline and same stage", async () => {
      mockFindById.mockResolvedValue({ ...baseDealRow });

      const result = await dealService.updateStage(
        "t1",
        "d1",
        { stage: "Lead" },
        "u1",
      );

      expect(result).toEqual(expect.objectContaining({ stage: "Lead" }));
      expect(mockCreateDealRevision).not.toHaveBeenCalled();
    });

    it("runs STAGE_EXIT with source rules pipeline then revision when moving to another pipeline", async () => {
      mockFindById.mockResolvedValue({ ...baseDealRow, contactId: "c1" });
      mockFindDefaultPipeline.mockResolvedValue({
        id: "p2",
        name: "Remarketing",
        stages: [{ id: "st2", name: "Qualification", probability: 5 }],
      });
      mockCreateDealRevision.mockResolvedValue({
        ...baseDealRow,
        id: "d1-rev",
        contactId: "c1",
        pipelineId: "p2",
        stage: "Qualification",
      });

      await dealService.updateStage(
        "t1",
        "d1",
        { stage: "Qualification", pipelineId: "p2" },
        "u1",
      );

      expect(mockExecuteWorkflowRules).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: "STAGE_EXIT",
          deal: expect.objectContaining({ pipelineId: "p1", stage: "Lead" }),
          previousStage: "Lead",
        }),
        { rulesPipelineId: "p1" },
      );
      expect(mockCreateDealRevision).toHaveBeenCalledWith(
        "d1",
        "t1",
        expect.objectContaining({
          pipelineId: "p2",
          stage: "Qualification",
          probability: 5,
        }),
        "u1",
        null,
      );
      expect(mockUpdateContactByWorkflow).toHaveBeenCalledWith("t1", "c1", {
        journeyType: "Remarketing",
      });
    });
  });
});
