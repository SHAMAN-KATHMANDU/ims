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

  it("accepts newly added CRM and member trigger families", () => {
    const result = CreateAutomationDefinitionSchema.parse({
      name: "Lead follow-up automation",
      scopeType: "GLOBAL",
      triggers: [
        { eventName: "crm.lead.converted" },
        { eventName: "members.member.status_changed" },
      ],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "Automation event received",
            message: "A supported CRM/member trigger fired",
          },
        },
      ],
    });

    expect(result.triggers.map((trigger) => trigger.eventName)).toEqual([
      "crm.lead.converted",
      "members.member.status_changed",
    ]);
  });

  it("accepts expanded catalog, location, and inventory trigger families", () => {
    const result = CreateAutomationDefinitionSchema.parse({
      name: "Catalog watcher",
      scopeType: "GLOBAL",
      triggers: [
        { eventName: "catalog.product.updated" },
        { eventName: "locations.location.updated" },
        { eventName: "inventory.stock.adjusted" },
      ],
      steps: [
        {
          actionType: "webhook.emit",
          actionConfig: {
            url: "https://example.com/webhook",
            method: "POST",
          },
        },
      ],
    });

    expect(result.triggers.map((trigger) => trigger.eventName)).toEqual([
      "catalog.product.updated",
      "locations.location.updated",
      "inventory.stock.adjusted",
    ]);
  });

  it("accepts entity-specific CRM contact update actions", () => {
    const result = CreateAutomationDefinitionSchema.parse({
      name: "Lead conversion contact sync",
      scopeType: "GLOBAL",
      triggers: [{ eventName: "crm.lead.converted" }],
      steps: [
        {
          actionType: "crm.contact.update",
          actionConfig: {
            contactIdTemplate: "{{event.payload.contactId}}",
            field: "status",
            value: "CUSTOMER",
          },
        },
      ],
    });

    expect(result.steps[0]).toMatchObject({
      actionType: "crm.contact.update",
    });
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
