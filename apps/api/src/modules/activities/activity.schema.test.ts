import { describe, it, expect } from "vitest";
import { CreateActivitySchema } from "./activity.schema";

describe("CreateActivitySchema", () => {
  it("accepts valid type with contactId", () => {
    const result = CreateActivitySchema.parse({
      type: "CALL",
      contactId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.type).toBe("CALL");
    expect(result.contactId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts type with dealId", () => {
    const result = CreateActivitySchema.parse({
      type: "MEETING",
      dealId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.type).toBe("MEETING");
    expect(result.dealId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects invalid type", () => {
    expect(() =>
      CreateActivitySchema.parse({
        type: "INVALID",
        contactId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("rejects when no contactId, memberId, or dealId", () => {
    expect(() => CreateActivitySchema.parse({ type: "CALL" })).toThrow();
  });
});
