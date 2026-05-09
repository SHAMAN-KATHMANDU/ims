/**
 * Site template schema validation tests.
 */

import { describe, it, expect } from "vitest";
import {
  ForkTemplateSchema,
  UpdateTemplateSchema,
  CreateTemplateSchema,
} from "./site-templates.schema";

describe("site-templates.schema", () => {
  describe("ForkTemplateSchema", () => {
    it("accepts valid fork input", () => {
      const input = { name: "My Custom Fork" };
      expect(() => ForkTemplateSchema.parse(input)).not.toThrow();
    });

    it("rejects missing name", () => {
      expect(() => ForkTemplateSchema.parse({})).toThrow();
    });

    it("rejects name exceeding max length", () => {
      expect(() =>
        ForkTemplateSchema.parse({ name: "x".repeat(201) }),
      ).toThrow();
    });
  });

  describe("UpdateTemplateSchema", () => {
    it("accepts partial update", () => {
      const input = { name: "Updated Name" };
      expect(() => UpdateTemplateSchema.parse(input)).not.toThrow();
    });

    it("accepts all optional fields", () => {
      const input = {
        name: "New Name",
        description: "New description",
        defaultLayouts: { home: [] },
        defaultThemeTokens: { colors: { primary: "#000" } },
      };
      expect(() => UpdateTemplateSchema.parse(input)).not.toThrow();
    });

    it("allows null values for JSON fields", () => {
      const input = {
        defaultLayouts: null,
        defaultThemeTokens: null,
      };
      expect(() => UpdateTemplateSchema.parse(input)).not.toThrow();
    });

    it("rejects invalid description length", () => {
      expect(() =>
        UpdateTemplateSchema.parse({
          description: "x".repeat(501),
        }),
      ).toThrow();
    });
  });

  describe("CreateTemplateSchema", () => {
    it("accepts valid create input", () => {
      const input = {
        slug: "my-template",
        name: "My Template",
        description: "Test template",
      };
      expect(() => CreateTemplateSchema.parse(input)).not.toThrow();
    });

    it("requires slug and name", () => {
      expect(() => CreateTemplateSchema.parse({})).toThrow();
    });

    it("accepts optional category", () => {
      const input = {
        slug: "my-template",
        name: "My Template",
        category: "fashion",
      };
      expect(() => CreateTemplateSchema.parse(input)).not.toThrow();
    });
  });
});
