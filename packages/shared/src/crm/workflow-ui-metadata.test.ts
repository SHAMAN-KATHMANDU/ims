import { describe, expect, it } from "vitest";
import {
  getWorkflowActionLabel,
  getWorkflowTriggerLabel,
} from "./workflow-ui-metadata";

describe("workflow-ui-metadata", () => {
  it("getWorkflowTriggerLabel returns catalog label for known triggers", () => {
    expect(getWorkflowTriggerLabel("DEAL_CREATED")).toBe("Deal created");
  });

  it("getWorkflowTriggerLabel returns raw value for unknown triggers", () => {
    expect(getWorkflowTriggerLabel("FUTURE_TRIGGER")).toBe("FUTURE_TRIGGER");
  });

  it("getWorkflowActionLabel returns catalog label for known actions", () => {
    expect(getWorkflowActionLabel("CREATE_TASK")).toBe("Create task");
  });

  it("getWorkflowActionLabel returns raw value for unknown actions", () => {
    expect(getWorkflowActionLabel("FUTURE_ACTION")).toBe("FUTURE_ACTION");
  });
});
