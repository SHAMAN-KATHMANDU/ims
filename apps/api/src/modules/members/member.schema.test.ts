import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateMemberSchema, UpdateMemberSchema } from "./member.schema";

vi.mock("@/utils/phone", () => ({
  parseAndValidatePhone: vi.fn((val: string) => {
    if (!val || String(val).trim() === "") {
      return { valid: false, message: "Phone number is required" };
    }
    if (val === "invalid") {
      return { valid: false, message: "Invalid phone number" };
    }
    return { valid: true, e164: "+9779841234567" };
  }),
}));

describe("CreateMemberSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid create payload with required phone", () => {
    const result = CreateMemberSchema.parse({
      phone: "9841234567",
      name: "John",
      email: "john@test.com",
      notes: "VIP",
    });
    expect(result.phone).toBe("+9779841234567");
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@test.com");
    expect(result.notes).toBe("VIP");
  });

  it("accepts minimal payload with only phone", () => {
    const result = CreateMemberSchema.parse({ phone: "9841234567" });
    expect(result.phone).toBe("+9779841234567");
    expect(result.name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.notes).toBeNull();
  });

  it("rejects when phone is missing", () => {
    expect(() => CreateMemberSchema.parse({})).toThrow();
  });

  it("rejects when phone is empty string", () => {
    expect(() => CreateMemberSchema.parse({ phone: "" })).toThrow();
  });

  it("transforms empty optional strings to null", () => {
    const result = CreateMemberSchema.parse({
      phone: "9841234567",
      name: "",
      email: undefined,
    });
    expect(result.name).toBeNull();
    expect(result.email).toBeNull();
  });
});

describe("UpdateMemberSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts partial update with optional fields", () => {
    const result = UpdateMemberSchema.parse({
      name: "Jane",
      isActive: true,
    });
    expect(result.name).toBe("Jane");
    expect(result.isActive).toBe(true);
    expect(result.phone).toBeUndefined();
  });

  it("accepts empty object", () => {
    const result = UpdateMemberSchema.parse({});
    expect(result).toEqual({});
  });

  it("coerces isActive boolean", () => {
    const result = UpdateMemberSchema.parse({ isActive: "true" });
    expect(result.isActive).toBe(true);
  });

  it("transforms empty name to null when provided", () => {
    const result = UpdateMemberSchema.parse({ name: "" });
    expect(result.name).toBeNull();
  });
});
