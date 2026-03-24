import { describe, it, expect } from "vitest";
import {
  CreateWorkflowSchema,
  CreateWorkflowRuleSchema,
  UpdateWorkflowSchema,
  parseActionConfig,
  type CreateTaskConfig,
  type MoveStageConfig,
  type UpdateContactFieldConfig,
} from "./workflow.schema";

describe("Workflow Schemas", () => {
  describe("CreateWorkflowSchema", () => {
    it("accepts valid workflow", () => {
      const result = CreateWorkflowSchema.parse({
        pipelineId: "00000000-0000-0000-0000-000000000001",
        name: "Follow-up automation",
        isActive: true,
      });
      expect(result.name).toBe("Follow-up automation");
      expect(result.isActive).toBe(true);
    });

    it("rejects missing pipelineId", () => {
      expect(() => CreateWorkflowSchema.parse({ name: "Test" })).toThrow();
    });

    it("rejects invalid pipelineId", () => {
      expect(() =>
        CreateWorkflowSchema.parse({
          pipelineId: "not-uuid",
          name: "Test",
        }),
      ).toThrow();
    });
  });

  describe("CreateWorkflowRuleSchema", () => {
    it("accepts valid rule", () => {
      const result = CreateWorkflowRuleSchema.parse({
        trigger: "STAGE_ENTER",
        triggerStageId: "stage-1",
        action: "CREATE_TASK",
        actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
      });
      expect(result.trigger).toBe("STAGE_ENTER");
      expect(result.action).toBe("CREATE_TASK");
    });

    it("rejects invalid trigger", () => {
      expect(() =>
        CreateWorkflowRuleSchema.parse({
          trigger: "INVALID",
          action: "CREATE_TASK",
          actionConfig: {},
        }),
      ).toThrow();
    });
  });

  describe("UpdateWorkflowSchema", () => {
    it("accepts partial update", () => {
      const result = UpdateWorkflowSchema.parse({ isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe("parseActionConfig", () => {
    it("parses UPDATE_CONTACT_FIELD with allowlisted field", () => {
      const c = parseActionConfig("UPDATE_CONTACT_FIELD", {
        field: "journeyType",
        value: "Customer",
      }) as UpdateContactFieldConfig;
      expect(c.field).toBe("journeyType");
      expect(c.value).toBe("Customer");
    });

    it("rejects UPDATE_CONTACT_FIELD with unknown field", () => {
      expect(() =>
        parseActionConfig("UPDATE_CONTACT_FIELD", {
          field: "purchaseCount",
          value: "1",
        }),
      ).toThrow();
    });

    it("parses MOVE_STAGE with optional targetPipelineId", () => {
      const c = parseActionConfig("MOVE_STAGE", {
        targetStageId: "Won",
        targetPipelineId: "550e8400-e29b-41d4-a716-446655440000",
      }) as MoveStageConfig;
      expect(c.targetStageId).toBe("Won");
      expect(c.targetPipelineId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("parses CREATE_TASK with OPEN_DEAL_IN_PIPELINE link", () => {
      const c = parseActionConfig("CREATE_TASK", {
        taskTitle: "X",
        taskDealLink: {
          mode: "OPEN_DEAL_IN_PIPELINE",
          targetPipelineId: "00000000-0000-0000-0000-000000000099",
        },
      }) as CreateTaskConfig;
      expect(c.taskDealLink?.mode).toBe("OPEN_DEAL_IN_PIPELINE");
    });
  });
});
