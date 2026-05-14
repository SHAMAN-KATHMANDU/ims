import { describe, it, expect } from "vitest";
import { parseAndValidatePhone, parsePhoneForMemberLookup } from "./phone";

describe("parsePhoneForMemberLookup", () => {
  it("accepts Nepal 10-digit mobile that strict validation may reject", () => {
    const r = parsePhoneForMemberLookup("9700000333", "NP");
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.e164).toMatch(/^\+977/);
    }
  });

  it("rejects empty input", () => {
    const r = parsePhoneForMemberLookup("  ", "NP");
    expect(r.valid).toBe(false);
  });
});

describe("parseAndValidatePhone", () => {
  it("rejects non-numeric garbage", () => {
    const r = parseAndValidatePhone("not-a-phone", "NP");
    expect(r.valid).toBe(false);
  });
});
