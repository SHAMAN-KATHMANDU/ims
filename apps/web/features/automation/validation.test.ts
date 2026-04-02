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

  it("accepts new CRM and member triggers in the form schema", () => {
    const result = AutomationDefinitionFormSchema.parse({
      name: "CRM/member automation",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      triggers: [
        { eventName: "crm.contact.updated", delayMinutes: 0 },
        { eventName: "members.member.created", delayMinutes: 0 },
      ],
      steps: [
        {
          actionType: "webhook.emit",
          actionConfig: {
            url: "https://example.com/webhook",
            method: "POST",
          },
          continueOnError: false,
        },
      ],
    });

    expect(result.triggers.map((trigger) => trigger.eventName)).toEqual([
      "crm.contact.updated",
      "members.member.created",
    ]);
  });

  it("accepts conditions and expanded domain triggers", () => {
    const result = AutomationDefinitionFormSchema.parse({
      name: "High-value sale watcher",
      description: "",
      scopeType: "LOCATION",
      scopeId: "00000000-0000-0000-0000-000000000001",
      triggers: [
        {
          eventName: "sales.sale.high_value_created",
          conditions: [{ path: "total", operator: "gte", value: 5000 }],
          delayMinutes: 0,
        },
        {
          eventName: "catalog.product.updated",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "webhook.emit",
          actionConfig: {
            url: "https://example.com/webhook",
            method: "POST",
          },
          continueOnError: false,
        },
      ],
    });

    expect(result.triggers[0]?.conditions).toEqual([
      { path: "total", operator: "gte", value: 5000 },
    ]);
    expect(result.triggers[1]?.eventName).toBe("catalog.product.updated");
  });

  it("accepts entity-specific CRM update actions", () => {
    const result = AutomationDefinitionFormSchema.parse({
      name: "Converted lead contact sync",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      triggers: [{ eventName: "crm.lead.converted", delayMinutes: 0 }],
      steps: [
        {
          actionType: "crm.contact.update",
          actionConfig: {
            contactIdTemplate: "{{event.payload.contactId}}",
            field: "status",
            value: "CUSTOMER",
          },
          continueOnError: false,
        },
      ],
    });

    expect(result.steps[0]?.actionType).toBe("crm.contact.update");
  });
});
