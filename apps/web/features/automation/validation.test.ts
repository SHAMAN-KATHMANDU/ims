import { describe, expect, it } from "vitest";
import { AutomationDefinitionFormSchema } from "./validation";

describe("AutomationDefinitionFormSchema", () => {
  it("applies defaults for execution mode, suppression, and trigger delay", () => {
    const result = AutomationDefinitionFormSchema.parse({
      name: "Restock automation",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      triggers: [{ eventName: "inventory.stock.low_detected" }],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Create restock task",
            type: "RESTOCK_REQUEST",
            priority: "HIGH",
          },
        },
      ],
    });

    expect(result.executionMode).toBe("LIVE");
    expect(result.suppressLegacyWorkflows).toBe(false);
    expect(result.triggers[0]?.delayMinutes).toBe(0);
    expect(result.steps[0]?.continueOnError).toBe(false);
  });

  it("rejects incompatible actions for the selected trigger set", () => {
    const result = AutomationDefinitionFormSchema.safeParse({
      name: "Bad transfer automation",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      triggers: [{ eventName: "sales.sale.created", delayMinutes: 0 }],
      steps: [
        {
          actionType: "transfer.create_draft",
          actionConfig: {
            payloadPath: "suggestedTransfer",
          },
          continueOnError: false,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["steps", 0, "actionType"],
          message:
            'Action "transfer.create_draft" is not compatible with the selected trigger set',
        }),
      ]),
    );
  });

  it("accepts webhook configs with timeout overrides", () => {
    const result = AutomationDefinitionFormSchema.parse({
      name: "Webhook automation",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      triggers: [{ eventName: "sales.sale.created", delayMinutes: 0 }],
      steps: [
        {
          actionType: "webhook.emit",
          actionConfig: {
            url: "https://example.com/webhook",
            method: "POST",
            timeoutSeconds: 15,
          },
          continueOnError: false,
        },
      ],
    });

    expect(result.steps[0]?.actionConfig).toEqual({
      url: "https://example.com/webhook",
      method: "POST",
      timeoutSeconds: 15,
    });
  });
});
