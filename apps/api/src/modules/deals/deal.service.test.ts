import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockFindDefaultPipeline = vi.fn();
const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockCreateDealRevision = vi.fn();
const mockExecuteWorkflowRules = vi.fn().mockResolvedValue(undefined);
const mockGetPipelineClosingStageNames = vi.fn().mockResolvedValue(null);
const mockPublishDomainEvent = vi.fn().mockResolvedValue(undefined);

vi.mock("@/shared/validation/reference-validator", () => ({
  assertEntityExists: vi.fn().mockResolvedValue(undefined),
  resolvePipelineStage: (args: { stageName: string }) =>
    Promise.resolve(args.stageName),
}));

vi.mock("@/modules/workflows/workflow.engine", () => ({
  executeWorkflowRules: (...args: unknown[]) =>
    mockExecuteWorkflowRules(...args),
}));

vi.mock("@/modules/pipeline-transitions/pipeline-transition.service", () => ({
  default: { handleDealEvent: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/modules/contacts/contact.repository", () => ({
  default: {
    updateContactByWorkflow: vi.fn().mockResolvedValue(undefined),
    incrementPurchaseCount: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
  },
}));

vi.mock("./deal.repository", () => ({
  default: {
    findDefaultPipeline: (...args: unknown[]) =>
      mockFindDefaultPipeline(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    getPipelineClosingStageNames: (...args: unknown[]) =>
      mockGetPipelineClosingStageNames(...args),
    findAll: vi.fn(),
    findKanban: vi.fn(),
    createDealRevision: (...args: unknown[]) => mockCreateDealRevision(...args),
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

    it("creates a deal without mutating contact journey type metadata", async () => {
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

      expect(mockCreate).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ name: "Deal 1", contactId: "c1" }),
        "u1",
        "Lead",
        "p1",
      );
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
          status: "OPEN",
          closedAt: null,
        }),
        "u1",
        null,
      );
    });
  });

  describe("deal closure events", () => {
    it("publishes crm.deal.won when status transitions to WON", async () => {
      mockFindById.mockResolvedValue({ ...baseDealRow, status: "OPEN" });
      mockCreateDealRevision.mockResolvedValue({
        ...baseDealRow,
        status: "WON",
        value: 1500,
        revisionNo: 2,
      });

      await dealService.update("t1", "d1", { status: "WON" }, "u1");

      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "crm.deal.won",
          entityType: "DEAL",
          entityId: "d1",
          scopeType: "CRM_PIPELINE",
          payload: expect.objectContaining({ status: "WON", value: 1500 }),
        }),
      );
    });

    it("publishes crm.deal.lost when status transitions to LOST", async () => {
      mockFindById.mockResolvedValue({ ...baseDealRow, status: "OPEN" });
      mockCreateDealRevision.mockResolvedValue({
        ...baseDealRow,
        status: "LOST",
        value: 0,
        revisionNo: 2,
      });

      await dealService.update("t1", "d1", { status: "LOST" }, "u1");

      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "crm.deal.lost",
          payload: expect.objectContaining({ status: "LOST" }),
        }),
      );
    });

    it("does not re-publish when the deal is already WON", async () => {
      mockFindById.mockResolvedValue({ ...baseDealRow, status: "WON" });
      mockCreateDealRevision.mockResolvedValue({
        ...baseDealRow,
        status: "WON",
        value: 1500,
        revisionNo: 3,
      });

      await dealService.update("t1", "d1", { status: "WON" }, "u1");

      expect(mockPublishDomainEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "crm.deal.won" }),
      );
    });
  });
});
