import { describe, it, expect } from "vitest";
import { createPipelineSchema, updatePipelineSchema } from "./pipeline.schema";

describe("pipeline schemas", () => {
  it("validates createPipelineSchema and trims name", () => {
    const parsed = createPipelineSchema.parse({
      name: "  Sales Pipeline ",
      isDefault: true,
      stages: [{ id: "1", name: " Qualification ", order: 1, probability: 10 }],
    });

    expect(parsed.name).toBe("Sales Pipeline");
    expect(parsed.stages?.[0]?.name).toBe("Qualification");
  });

  it("rejects empty pipeline name", () => {
    const result = createPipelineSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range stage probability", () => {
    const result = createPipelineSchema.safeParse({
      name: "Pipeline A",
      stages: [{ id: "1", name: "Stage", order: 1, probability: 120 }],
    });
    expect(result.success).toBe(false);
  });

  it("validates updatePipelineSchema partial payload", () => {
    const parsed = updatePipelineSchema.parse({
      name: "  Updated ",
      isDefault: false,
    });
    expect(parsed.name).toBe("Updated");
    expect(parsed.isDefault).toBe(false);
  });
});
