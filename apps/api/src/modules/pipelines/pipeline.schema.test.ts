import { describe, it, expect } from "vitest";
import { CreatePipelineSchema, UpdatePipelineSchema } from "./pipeline.schema";

describe("CreatePipelineSchema", () => {
  it("accepts valid name only", () => {
    const result = CreatePipelineSchema.parse({ name: "Sales" });
    expect(result.name).toBe("Sales");
    expect(result.stages).toBeUndefined();
  });

  it("accepts name with stages and isDefault", () => {
    const stages = [{ id: "1", name: "Stage 1", order: 1, probability: 10 }];
    const result = CreatePipelineSchema.parse({
      name: "Sales",
      stages,
      isDefault: true,
    });
    expect(result.name).toBe("Sales");
    expect(result.stages).toEqual(stages);
    expect(result.isDefault).toBe(true);
  });

  it("accepts optional pipeline type", () => {
    const result = CreatePipelineSchema.parse({
      name: "Repurchase",
      type: "REPURCHASE",
    });
    expect(result.type).toBe("REPURCHASE");
  });

  it("rejects empty name", () => {
    expect(() => CreatePipelineSchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreatePipelineSchema.parse({})).toThrow();
  });
});

describe("UpdatePipelineSchema", () => {
  it("accepts partial update", () => {
    const result = UpdatePipelineSchema.parse({ name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("accepts empty object", () => {
    const result = UpdatePipelineSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts stages without probability (defaults to 0)", () => {
    const stages = [{ id: "1", name: "Stage 1", order: 1 }];
    const result = UpdatePipelineSchema.parse({ stages });
    expect(result.stages).toEqual([
      { id: "1", name: "Stage 1", order: 1, probability: 0 },
    ]);
  });
});
