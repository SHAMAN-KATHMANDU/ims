import { describe, expect, it } from "vitest";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_TRIGGER_EVENT_VALUES,
} from "./automation-enums";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AUTOMATION_TRIGGER_EVENT_CATALOG,
  getAutomationEventGroup,
} from "./automation-trigger-events";

describe("AUTOMATION_TRIGGER_EVENT_CATALOG", () => {
  it("has a non-empty label and description for every trigger event value", () => {
    for (const event of AUTOMATION_TRIGGER_EVENT_VALUES) {
      const entry = AUTOMATION_TRIGGER_EVENT_CATALOG[event];
      expect(entry, `missing catalog entry for ${event}`).toBeDefined();
      expect(entry.label.trim().length).toBeGreaterThan(0);
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no extra keys beyond AUTOMATION_TRIGGER_EVENT_VALUES", () => {
    const catalogKeys = Object.keys(AUTOMATION_TRIGGER_EVENT_CATALOG).sort();
    const valueKeys = [...AUTOMATION_TRIGGER_EVENT_VALUES].sort();
    expect(catalogKeys).toEqual(valueKeys);
  });

  it("maps every event to a known UI group", () => {
    for (const event of AUTOMATION_TRIGGER_EVENT_VALUES) {
      const group = getAutomationEventGroup(event);
      expect(typeof group).toBe("string");
      expect(group.length).toBeGreaterThan(0);
    }
  });
});

describe("AUTOMATION_ACTION_TYPE_DESCRIPTIONS", () => {
  it("covers every action type value", () => {
    for (const action of AUTOMATION_ACTION_TYPE_VALUES) {
      const meta = AUTOMATION_ACTION_TYPE_DESCRIPTIONS[action];
      expect(meta, `missing description for ${action}`).toBeDefined();
      expect(meta.label.trim().length).toBeGreaterThan(0);
      expect(meta.description.trim().length).toBeGreaterThan(0);
    }
  });
});
