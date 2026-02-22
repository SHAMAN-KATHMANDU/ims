import { describe, it, expect } from "vitest";
import { createActivitySchema } from "./activity.schema";

describe("activity schemas", () => {
  it("validates and trims create payload", () => {
    const parsed = createActivitySchema.parse({
      type: "CALL",
      subject: "  Intro call ",
      contactId: " contact-1 ",
    });

    expect(parsed.subject).toBe("Intro call");
    expect(parsed.contactId).toBe("contact-1");
  });

  it("rejects invalid type", () => {
    const result = createActivitySchema.safeParse({
      type: "EMAIL",
      contactId: "c1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects payload when no target id is provided", () => {
    const result = createActivitySchema.safeParse({
      type: "MEETING",
      subject: "Plan",
    });
    expect(result.success).toBe(false);
  });

  it("accepts member or deal target ids", () => {
    const withMember = createActivitySchema.safeParse({
      type: "MEETING",
      memberId: "m1",
    });
    const withDeal = createActivitySchema.safeParse({
      type: "CALL",
      dealId: "d1",
    });

    expect(withMember.success).toBe(true);
    expect(withDeal.success).toBe(true);
  });
});
