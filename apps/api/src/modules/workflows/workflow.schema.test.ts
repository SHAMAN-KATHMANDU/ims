import { describe, it, expect } from "vitest";
import {
  CreateWorkflowSchema,
  CreateWorkflowRuleSchema,
  GetWorkflowRunsQuerySchema,
  InstallWorkflowTemplateSchema,
  UpdateWorkflowSchema,
  WorkflowTemplateKeyParamSchema,
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

    it("rejects stage-based rules when trigger stage is unset (undefined)", () => {
      expect(() =>
        CreateWorkflowRuleSchema.parse({
          trigger: "STAGE_ENTER",
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Follow up" },
        }),
      ).toThrow(/Choose a specific stage or Any stage/);
    });

    it("accepts stage-based rules with null triggerStageId (any stage)", () => {
      const result = CreateWorkflowRuleSchema.parse({
        trigger: "STAGE_ENTER",
        triggerStageId: null,
        action: "CREATE_TASK",
        actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
      });
      expect(result.triggerStageId).toBeNull();
    });

    it("rejects stage-based rules with empty triggerStageId", () => {
      expect(() =>
        CreateWorkflowRuleSchema.parse({
          trigger: "STAGE_EXIT",
          triggerStageId: "",
          action: "CREATE_TASK",
          actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
        }),
      ).toThrow(/Choose a specific stage or Any stage/);
    });
  });

  describe("UpdateWorkflowSchema", () => {
    it("accepts partial update", () => {
      const result = UpdateWorkflowSchema.parse({ isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe("template schemas", () => {
    it("accepts known workflow template key", () => {
      const result = WorkflowTemplateKeyParamSchema.parse({
        templateKey: "new-sales-sales-won-follow-up",
      });
      expect(result.templateKey).toBe("new-sales-sales-won-follow-up");
    });

    it("rejects unknown workflow template key", () => {
      expect(() =>
        WorkflowTemplateKeyParamSchema.parse({
          templateKey: "missing-template",
        }),
      ).toThrow();
    });

    it("parses install template payload defaults", () => {
      const result = InstallWorkflowTemplateSchema.parse({});
      expect(result.overwriteExisting).toBe(false);
      expect(result.activate).toBe(true);
    });

    it("parses workflow runs query limit", () => {
      const result = GetWorkflowRunsQuerySchema.parse({ limit: "15" });
      expect(result.limit).toBe(15);
    });
  });

  describe("parseActionConfig", () => {
    it("parses UPDATE_CONTACT_FIELD with allowlisted field", () => {
      const c = parseActionConfig("UPDATE_CONTACT_FIELD", {
        field: "source",
        value: "Website",
      }) as UpdateContactFieldConfig;
      expect(c.field).toBe("source");
      expect(c.value).toBe("Website");
    });

    it("rejects UPDATE_CONTACT_FIELD with unknown field", () => {
      expect(() =>
        parseActionConfig("UPDATE_CONTACT_FIELD", {
          field: "purchaseCount",
          value: "1",
        }),
      ).toThrow();
    });

    it("rejects UPDATE_CONTACT_FIELD for derived journey type", () => {
      expect(() =>
        parseActionConfig("UPDATE_CONTACT_FIELD", {
          field: "journeyType",
          value: "New Sales(Lead)",
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
