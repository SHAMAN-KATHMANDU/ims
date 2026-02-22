import { describe, it, expect } from "vitest";
import {
  createMemberSchema,
  memberIdParamsSchema,
  memberListQuerySchema,
  memberPhoneParamsSchema,
  updateMemberSchema,
} from "./member.schema";

describe("member schemas", () => {
  it("validates createMemberSchema and trims values", () => {
    const parsed = createMemberSchema.parse({
      phone: " 9800-000-000 ",
      name: "  Roshan ",
    });

    expect(parsed.phone).toBe("9800-000-000");
    expect(parsed.name).toBe("Roshan");
  });

  it("rejects missing phone", () => {
    const result = createMemberSchema.safeParse({ name: "Only Name" });
    expect(result.success).toBe(false);
  });

  it("validates updateMemberSchema partial payload", () => {
    const parsed = updateMemberSchema.parse({
      phone: " 9800000001 ",
      isActive: true,
    });

    expect(parsed.phone).toBe("9800000001");
    expect(parsed.isActive).toBe(true);
  });

  it("rejects empty phone in update payload", () => {
    const result = updateMemberSchema.safeParse({ phone: "   " });
    expect(result.success).toBe(false);
  });

  it("validates member path params schemas", () => {
    const idParsed = memberIdParamsSchema.parse({ id: "member-1" });
    const phoneParsed = memberPhoneParamsSchema.parse({ phone: "9800000000" });

    expect(idParsed.id).toBe("member-1");
    expect(phoneParsed.phone).toBe("9800000000");
  });

  it("validates memberListQuerySchema", () => {
    const parsed = memberListQuerySchema.parse({
      page: "2",
      limit: "20",
      search: "  john ",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
    expect(parsed.search).toBe("john");
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });
});
