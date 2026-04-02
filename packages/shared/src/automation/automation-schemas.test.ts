import { describe, expect, it } from "vitest";
import {
  AutomationConditionSchema,
  isValidAutomationInConditionValue,
  normalizeAutomationInConditionValue,
} from "./automation-schemas";

describe("isValidAutomationInConditionValue", () => {
  it("accepts arrays, comma strings, JSON arrays, and single non-empty strings", () => {
    expect(isValidAutomationInConditionValue(["a", "b"])).toBe(true);
    expect(isValidAutomationInConditionValue("a,b")).toBe(true);
    expect(isValidAutomationInConditionValue('["x","y"]')).toBe(true);
    expect(isValidAutomationInConditionValue("solo")).toBe(true);
  });

  it("rejects empty, invalid JSON array strings, and non-string non-arrays", () => {
    expect(isValidAutomationInConditionValue("")).toBe(false);
    expect(isValidAutomationInConditionValue("   ")).toBe(false);
    expect(isValidAutomationInConditionValue("[not json")).toBe(false);
    // Non-array JSON is treated as a single literal token for matching
    expect(isValidAutomationInConditionValue('{"a":1}')).toBe(true);
    expect(isValidAutomationInConditionValue(1)).toBe(false);
    expect(isValidAutomationInConditionValue(null)).toBe(false);
  });
});

describe("normalizeAutomationInConditionValue", () => {
  it("normalizes comma-separated and JSON array strings", () => {
    expect(normalizeAutomationInConditionValue(" a , b ")).toEqual(["a", "b"]);
    expect(normalizeAutomationInConditionValue('["1","2"]')).toEqual([
      "1",
      "2",
    ]);
  });

  it("wraps a single token in an array", () => {
    expect(normalizeAutomationInConditionValue("only")).toEqual(["only"]);
  });
});

describe("AutomationConditionSchema", () => {
  it('transforms operator "in" values to arrays', () => {
    const parsed = AutomationConditionSchema.parse({
      path: "status",
      operator: "in",
      value: "open,closed",
    });
    expect(parsed.value).toEqual(["open", "closed"]);
  });

  it('accepts "exists" without value', () => {
    const parsed = AutomationConditionSchema.parse({
      path: "foo",
      operator: "exists",
    });
    expect(parsed.value).toBeUndefined();
  });

  it("coerces numeric comparators to finite numbers", () => {
    const parsed = AutomationConditionSchema.parse({
      path: "amount",
      operator: "gte",
      value: "10",
    });
    expect(parsed.value).toBe(10);
  });

  it("rejects non-finite numbers for numeric operators", () => {
    expect(() =>
      AutomationConditionSchema.parse({
        path: "amount",
        operator: "gt",
        value: "nan",
      }),
    ).toThrow();
  });

  it('rejects invalid "in" values', () => {
    expect(() =>
      AutomationConditionSchema.parse({
        path: "x",
        operator: "in",
        value: "[broken",
      }),
    ).toThrow();
  });
});
