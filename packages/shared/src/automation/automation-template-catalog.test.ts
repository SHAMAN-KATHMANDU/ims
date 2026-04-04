import { describe, expect, it } from "vitest";
import {
  AUTOMATION_TEMPLATE_CATALOG,
  AutomationTemplateFormValuesSchema,
} from "./automation-template-catalog";

describe("AUTOMATION_TEMPLATE_CATALOG", () => {
  it("has unique ids", () => {
    const ids = AUTOMATION_TEMPLATE_CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("parses every template values payload", () => {
    for (const entry of AUTOMATION_TEMPLATE_CATALOG) {
      const parsed = AutomationTemplateFormValuesSchema.safeParse(entry.values);
      expect(parsed.success, entry.id).toBe(true);
    }
  });
});
