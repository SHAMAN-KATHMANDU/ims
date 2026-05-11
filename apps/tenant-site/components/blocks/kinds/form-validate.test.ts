/**
 * Validation contract for FormBlock — locks the inline error messages
 * so a future renderer change doesn't silently swap them and confuse
 * downstream a11y testing.
 */

import { describe, it, expect } from "vitest";
import { validateFormFields } from "@repo/blocks";
import type { FormFieldDef } from "@repo/shared";

describe("validateFormFields", () => {
  it("flags required fields that are blank", () => {
    const fields: FormFieldDef[] = [
      { kind: "text", label: "Name", required: true },
      { kind: "text", label: "Optional", required: false },
    ];
    const errors = validateFormFields(fields, { Name: "", Optional: "" });
    expect(errors).toEqual({ Name: "Name is required." });
  });

  it("treats whitespace-only as empty for required fields", () => {
    const fields: FormFieldDef[] = [
      { kind: "text", label: "Name", required: true },
    ];
    const errors = validateFormFields(fields, { Name: "   " });
    expect(errors.Name).toBe("Name is required.");
  });

  it("validates email format", () => {
    const fields: FormFieldDef[] = [
      { kind: "email", label: "Email", required: true },
    ];
    expect(validateFormFields(fields, { Email: "not-an-email" }).Email).toMatch(
      /valid email/i,
    );
    expect(validateFormFields(fields, { Email: "ok@example.com" })).toEqual({});
  });

  it("validates URL format and accepts protocol-less input", () => {
    const fields: FormFieldDef[] = [
      { kind: "url", label: "Website", required: true },
    ];
    expect(
      validateFormFields(fields, { Website: "shop.example/about" }),
    ).toEqual({});
    expect(
      validateFormFields(fields, { Website: "https://shop.example" }),
    ).toEqual({});
    expect(
      validateFormFields(fields, { Website: "not a url at all" }).Website,
    ).toMatch(/valid url/i);
  });

  it("enforces number min/max", () => {
    const fields: FormFieldDef[] = [
      { kind: "number", label: "Age", required: true, min: 18, max: 99 },
    ];
    expect(validateFormFields(fields, { Age: "10" }).Age).toMatch(/at least/);
    expect(validateFormFields(fields, { Age: "120" }).Age).toMatch(/at most/);
    expect(validateFormFields(fields, { Age: "30" })).toEqual({});
    expect(validateFormFields(fields, { Age: "abc" }).Age).toMatch(/number/i);
  });

  it("enforces text min/max length", () => {
    const fields: FormFieldDef[] = [
      { kind: "text", label: "Code", min: 4, max: 6 },
    ];
    expect(validateFormFields(fields, { Code: "ab" }).Code).toMatch(
      /at least 4 characters/,
    );
    expect(validateFormFields(fields, { Code: "way too long" }).Code).toMatch(
      /at most 6 characters/,
    );
    expect(validateFormFields(fields, { Code: "ABCD" })).toEqual({});
  });

  it("rejects pattern mismatches", () => {
    const fields: FormFieldDef[] = [
      { kind: "text", label: "SKU", pattern: "^[A-Z]{3}-\\d+$" },
    ];
    expect(validateFormFields(fields, { SKU: "abc-1" }).SKU).toMatch(
      /expected format/,
    );
    expect(validateFormFields(fields, { SKU: "ABC-1" })).toEqual({});
  });

  it("skips remaining checks when an optional field is empty", () => {
    const fields: FormFieldDef[] = [
      { kind: "email", label: "Email", required: false },
    ];
    expect(validateFormFields(fields, { Email: "" })).toEqual({});
  });
});
