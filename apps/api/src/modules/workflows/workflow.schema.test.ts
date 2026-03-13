import { describe, it, expect } from "vitest";
import {
  CreateWorkflowSchema,
  CreateWorkflowRuleSchema,
  UpdateWorkflowSchema,
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
});
