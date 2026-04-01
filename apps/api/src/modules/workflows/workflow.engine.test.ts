import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindActiveRulesByPipeline = vi.fn();
const mockTaskCreate = vi.fn();
const mockNotificationCreate = vi.fn();
const mockDealUpdate = vi.fn();
const mockActivityCreate = vi.fn();
const mockUpdateStageFromAutomation = vi.fn();

const { mockShouldSkipWorkflowRules } = vi.hoisted(() => ({
  mockShouldSkipWorkflowRules: vi.fn().mockReturnValue(false),
}));

vi.mock("./workflow.repository", () => ({
  default: {
    findActiveRulesByPipeline: (...args: unknown[]) =>
      mockFindActiveRulesByPipeline(...args),
  },
}));
vi.mock("./workflow-execution-context", () => ({
  shouldSkipWorkflowRules: () => mockShouldSkipWorkflowRules(),
  MAX_WORKFLOW_NESTING_DEPTH: 5,
  runWithIncreasedWorkflowNestingDepth: async <T>(fn: () => Promise<T>) => fn(),
}));
vi.mock("@/modules/tasks/task.repository", () => ({
  default: { create: (...args: unknown[]) => mockTaskCreate(...args) },
}));
vi.mock("@/modules/notifications/notification.repository", () => ({
  default: { create: (...args: unknown[]) => mockNotificationCreate(...args) },
}));
vi.mock("@/modules/deals/deal.repository", () => ({
  default: {
    update: (...args: unknown[]) => mockDealUpdate(...args),
  },
}));
vi.mock("@/modules/deals/deal.service", () => ({
  default: {
    updateStageFromAutomation: (...args: unknown[]) =>
      mockUpdateStageFromAutomation(...args),
  },
}));
vi.mock("@/modules/activities/activity.repository", () => ({
  default: { create: (...args: unknown[]) => mockActivityCreate(...args) },
}));
vi.mock("@/config/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { executeWorkflowRules } from "./workflow.engine";

const baseDeal = {
  id: "deal-1",
  tenantId: "t1",
  pipelineId: "p1",
  stage: "Proposal",
  status: "OPEN",
  contactId: "c1",
  memberId: null,
  companyId: null as string | null,
  assignedToId: "u1",
  createdById: "u1",
};

describe("WorkflowEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeWorkflowRules", () => {
    it("does nothing when no rules returned", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([]);

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockFindActiveRulesByPipeline).toHaveBeenCalledWith("t1", "p1");
      expect(mockTaskCreate).not.toHaveBeenCalled();
      expect(mockNotificationCreate).not.toHaveBeenCalled();
      expect(mockUpdateStageFromAutomation).not.toHaveBeenCalled();
      expect(mockActivityCreate).not.toHaveBeenCalled();
    });

    it("skips rule when trigger does not match", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "DEAL_WON",
          triggerStageId: null,
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Task", dueDateDays: 1 },
        },
      ]);

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockTaskCreate).not.toHaveBeenCalled();
    });

    it("executes CREATE_TASK when rule matches", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "DEAL_CREATED",
          triggerStageId: null,
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Follow up", dueDateDays: 2 },
        },
      ]);
      mockTaskCreate.mockResolvedValue({});

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockTaskCreate).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          title: "Follow up",
          contactId: "c1",
          memberId: null,
          dealId: "deal-1",
          assignedToId: "u1",
        }),
        "u1",
      );
    });

    it("executes SEND_NOTIFICATION when rule matches", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "DEAL_CREATED",
          triggerStageId: null,
          action: "SEND_NOTIFICATION",
          actionConfig: { title: "New deal", message: "A deal was created" },
        },
      ]);
      mockNotificationCreate.mockResolvedValue({});

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          type: "DEAL_STAGE_CHANGE",
          title: "New deal",
          message: "A deal was created",
          resourceType: "deal",
          resourceId: "deal-1",
        }),
      );
    });

    it("executes MOVE_STAGE when rule matches", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "STAGE_ENTER",
          triggerStageId: "Proposal",
          action: "MOVE_STAGE",
          actionConfig: { targetStageId: "Won" },
          workflow: { pipeline: { stages: [] } },
        },
      ]);
      mockUpdateStageFromAutomation.mockResolvedValue(undefined);

      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: { ...baseDeal, stage: "Proposal" },
        previousStage: "Qualification",
        userId: "u1",
      });

      expect(mockUpdateStageFromAutomation).toHaveBeenCalledWith(
        "t1",
        "deal-1",
        "Won",
        "u1",
        undefined,
      );
    });

    it("executes MOVE_STAGE with targetPipelineId", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "STAGE_ENTER",
          triggerStageId: "Proposal",
          action: "MOVE_STAGE",
          actionConfig: {
            targetStageId: "Lead",
            targetPipelineId: "550e8400-e29b-41d4-a716-446655440002",
          },
          workflow: { pipeline: { stages: [] } },
        },
      ]);
      mockUpdateStageFromAutomation.mockResolvedValue(undefined);

      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: { ...baseDeal, stage: "Proposal" },
        previousStage: "Qualification",
        userId: "u1",
      });

      expect(mockUpdateStageFromAutomation).toHaveBeenCalledWith(
        "t1",
        "deal-1",
        "Lead",
        "u1",
        "550e8400-e29b-41d4-a716-446655440002",
      );
    });

    it("loads rules from rulesPipelineId when provided", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([]);

      await executeWorkflowRules(
        {
          trigger: "STAGE_EXIT",
          deal: baseDeal,
          previousStage: "Lead",
          userId: "u1",
        },
        { rulesPipelineId: "p-source" },
      );

      expect(mockFindActiveRulesByPipeline).toHaveBeenCalledWith(
        "t1",
        "p-source",
      );
    });

    it("does not load rules when max workflow nesting depth is reached", async () => {
      mockShouldSkipWorkflowRules.mockReturnValueOnce(true);
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "DEAL_CREATED",
          triggerStageId: null,
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Task", dueDateDays: 1 },
        },
      ]);

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockFindActiveRulesByPipeline).not.toHaveBeenCalled();
      expect(mockTaskCreate).not.toHaveBeenCalled();
    });

    it("matches STAGE_ENTER when triggerStageId is stage ID and pipeline stages resolve to name", async () => {
      const stageId = "11111111-2222-3333-4444-555555555555";
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "STAGE_ENTER",
          triggerStageId: stageId,
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Task", dueDateDays: 1 },
          workflow: {
            pipeline: {
              stages: [
                { id: stageId, name: "Proposal" },
                { id: "other", name: "Won" },
              ],
            },
          },
        },
      ]);
      mockTaskCreate.mockResolvedValue({});

      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: { ...baseDeal, stage: "Proposal" },
        previousStage: "Qualification",
      });

      expect(mockTaskCreate).toHaveBeenCalled();
    });

    it("matches STAGE_ENTER only when deal.stage equals triggerStageId", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "STAGE_ENTER",
          triggerStageId: "Won",
          action: "CREATE_TASK",
          actionConfig: {},
        },
      ]);

      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: { ...baseDeal, stage: "Proposal" },
        previousStage: "Qualification",
      });

      expect(mockTaskCreate).not.toHaveBeenCalled();
    });

    it("matches STAGE_EXIT when previousStage equals triggerStageId", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "STAGE_EXIT",
          triggerStageId: "Qualification",
          action: "CREATE_ACTIVITY",
          actionConfig: { type: "CALL", subject: "Follow up" },
        },
      ]);
      mockActivityCreate.mockResolvedValue({});

      await executeWorkflowRules({
        trigger: "STAGE_EXIT",
        deal: { ...baseDeal, stage: "Proposal" },
        previousStage: "Qualification",
      });

      expect(mockActivityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          type: "CALL",
          subject: "Follow up",
          dealId: "deal-1",
          createdById: "u1",
        }),
      );
    });

    it("executes UPDATE_FIELD for expectedCloseDate", async () => {
      mockFindActiveRulesByPipeline.mockResolvedValue([
        {
          id: "r1",
          trigger: "DEAL_CREATED",
          triggerStageId: null,
          action: "UPDATE_FIELD",
          actionConfig: { field: "expectedCloseDate", value: "2026-04-10" },
        },
      ]);
      mockDealUpdate.mockResolvedValue({});

      await executeWorkflowRules({
        trigger: "DEAL_CREATED",
        deal: baseDeal,
      });

      expect(mockDealUpdate).toHaveBeenCalledWith(
        "deal-1",
        { expectedCloseDate: "2026-04-10T00:00:00.000Z" },
        "",
      );
    });
  });
});
