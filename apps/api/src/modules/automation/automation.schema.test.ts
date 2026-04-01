import { describe, expect, it } from "vitest";
import {
  CreateAutomationDefinitionSchema,
  ReplayAutomationEventSchema,
  UpdateAutomationDefinitionSchema,
} from "./automation.schema";

describe("automation.schema", () => {
  it("accepts a valid low-stock automation definition", () => {
    const result = CreateAutomationDefinitionSchema.parse({
      name: "Restock low inventory",
      scopeType: "LOCATION",
      scopeId: "00000000-0000-0000-0000-000000000001",
      triggers: [
        {
          eventName: "inventory.stock.low_detected",
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Restock location",
            type: "RESTOCK_REQUEST",
            priority: "HIGH",
          },
        },
      ],
    });

    expect(result.scopeType).toBe("LOCATION");
    expect(result.steps[0]?.actionType).toBe("workitem.create");
  });

  it("rejects invalid action config for webhook emit", () => {
    expect(() =>
      CreateAutomationDefinitionSchema.parse({
        name: "Broken webhook",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "inventory.stock.low_detected" }],
        steps: [
          {
            actionType: "webhook.emit",
            actionConfig: { url: "not-a-url" },
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects incompatible trigger and action combinations", () => {
    expect(() =>
      CreateAutomationDefinitionSchema.parse({
        name: "Invalid CRM action",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "sales.sale.created" }],
        steps: [
          {
            actionType: "crm.deal.move_stage",
            actionConfig: {
              dealIdTemplate: "{{event.entityId}}",
              targetStageId: "stage-1",
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts partial updates", () => {
    const result = UpdateAutomationDefinitionSchema.parse({
      status: "INACTIVE",
    });

    expect(result.status).toBe("INACTIVE");
  });

  it("defaults replay requests to restarting retries from scratch", () => {
    const result = ReplayAutomationEventSchema.parse({});

    expect(result).toEqual({ reprocessFromStart: true });
  });

  it("accepts replay requests that preserve attempt history", () => {
    const result = ReplayAutomationEventSchema.parse({
      reprocessFromStart: false,
    });

    expect(result.reprocessFromStart).toBe(false);
  });
});
