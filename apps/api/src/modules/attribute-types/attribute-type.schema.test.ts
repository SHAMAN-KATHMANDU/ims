import { describe, it, expect } from "vitest";
import {
  CreateAttributeTypeSchema,
  UpdateAttributeTypeSchema,
  CreateAttributeValueSchema,
  UpdateAttributeValueSchema,
} from "./attribute-type.schema";

describe("CreateAttributeTypeSchema", () => {
  it("accepts valid name and optional code", () => {
    const result = CreateAttributeTypeSchema.parse({
      name: "Color",
      code: "color",
    });
    expect(result.name).toBe("Color");
    expect(result.code).toBe("color");
    expect(result.displayOrder).toBe(0);
  });

  it("accepts name without code (code derived in service)", () => {
    const result = CreateAttributeTypeSchema.parse({ name: "Size" });
    expect(result.name).toBe("Size");
    expect(result.code).toBeUndefined();
    expect(result.displayOrder).toBe(0);
  });

  it("normalizes code when provided", () => {
    const result = CreateAttributeTypeSchema.parse({
      name: "Test",
      code: "  Some Code  ",
    });
    expect(result.code).toBe("some_code");
  });

  it("accepts displayOrder", () => {
    const result = CreateAttributeTypeSchema.parse({
      name: "Test",
      displayOrder: 5,
    });
    expect(result.displayOrder).toBe(5);
  });

  it("rejects empty name", () => {
    expect(() => CreateAttributeTypeSchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateAttributeTypeSchema.parse({})).toThrow();
  });
});

describe("UpdateAttributeTypeSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateAttributeTypeSchema.parse({ name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("accepts empty object", () => {
    const result = UpdateAttributeTypeSchema.parse({});
    expect(result).toEqual({});
  });
});

describe("CreateAttributeValueSchema", () => {
  it("accepts valid value", () => {
    const result = CreateAttributeValueSchema.parse({ value: "Red" });
    expect(result.value).toBe("Red");
    expect(result.displayOrder).toBe(0);
  });

  it("rejects empty value", () => {
    expect(() => CreateAttributeValueSchema.parse({ value: "" })).toThrow();
  });

  it("rejects missing value", () => {
    expect(() => CreateAttributeValueSchema.parse({})).toThrow();
  });
});

describe("UpdateAttributeValueSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateAttributeValueSchema.parse({ value: "Blue" });
    expect(result.value).toBe("Blue");
  });
});
