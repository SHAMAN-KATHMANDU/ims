import { describe, it, expect } from "vitest";
import {
  CreateCrmSourceSchema,
  UpdateCrmSourceSchema,
  CreateCrmJourneyTypeSchema,
  UpdateCrmJourneyTypeSchema,
} from "./crm-settings.schema";

describe("CreateCrmSourceSchema", () => {
  it("accepts valid name", () => {
    const result = CreateCrmSourceSchema.parse({ name: "Website" });
    expect(result.name).toBe("Website");
  });

  it("rejects empty name", () => {
    expect(() => CreateCrmSourceSchema.parse({ name: "" })).toThrow();
  });
});

describe("UpdateCrmSourceSchema", () => {
  it("accepts valid name", () => {
    const result = UpdateCrmSourceSchema.parse({ name: "Referral" });
    expect(result.name).toBe("Referral");
  });
});

describe("CreateCrmJourneyTypeSchema", () => {
  it("accepts valid name", () => {
    const result = CreateCrmJourneyTypeSchema.parse({ name: "Prospect" });
    expect(result.name).toBe("Prospect");
  });
});

describe("UpdateCrmJourneyTypeSchema", () => {
  it("accepts valid name", () => {
    const result = UpdateCrmJourneyTypeSchema.parse({ name: "Customer" });
    expect(result.name).toBe("Customer");
  });
});
