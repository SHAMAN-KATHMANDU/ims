import { describe, it, expect } from "vitest";
import { CreateDealSchema, UpdateDealStageSchema } from "./deal.schema";

describe("CreateDealSchema", () => {
  it("accepts valid name with defaults", () => {
    const result = CreateDealSchema.parse({ name: "Deal 1" });
    expect(result.name).toBe("Deal 1");
    expect(result.value).toBe(0);
  });

  it("accepts all optional fields", () => {
    const result = CreateDealSchema.parse({
      name: "Deal 1",
      value: 1000,
      stage: "Qualification",
      contactId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.value).toBe(1000);
    expect(result.stage).toBe("Qualification");
  });

  it("rejects empty name", () => {
    expect(() => CreateDealSchema.parse({ name: "" })).toThrow();
  });
});

describe("UpdateDealStageSchema", () => {
  it("accepts valid stage", () => {
    const result = UpdateDealStageSchema.parse({ stage: "Proposal" });
    expect(result.stage).toBe("Proposal");
  });

  it("accepts optional pipelineId", () => {
    const result = UpdateDealStageSchema.parse({
      stage: "Qualification",
      pipelineId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.pipelineId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects empty stage", () => {
    expect(() => UpdateDealStageSchema.parse({ stage: "" })).toThrow();
  });

  it("rejects invalid pipelineId", () => {
    expect(() =>
      UpdateDealStageSchema.parse({ stage: "A", pipelineId: "not-uuid" }),
    ).toThrow();
  });
});
