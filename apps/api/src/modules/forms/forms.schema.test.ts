import { describe, it, expect } from "vitest";
import { CreateFormSchema, UpdateFormSchema } from "./forms.schema";

describe("FormsSchema", () => {
  describe("CreateFormSchema", () => {
    it("accepts valid form data", () => {
      const data = {
        name: "Contact Form",
        slug: "contact",
        fields: [
          {
            kind: "text" as const,
            label: "Name",
            required: true,
          },
          {
            kind: "email" as const,
            label: "Email",
            required: true,
          },
        ],
        submitTo: "email" as const,
        recipients: ["admin@example.com"],
      };

      expect(() => CreateFormSchema.parse(data)).not.toThrow();
    });

    it("rejects invalid field kind", () => {
      const data = {
        name: "Contact Form",
        slug: "contact",
        fields: [
          {
            kind: "invalid",
            label: "Name",
          },
        ],
        submitTo: "email",
      };

      expect(() => CreateFormSchema.parse(data)).toThrow();
    });

    it("rejects name with only whitespace", () => {
      const data = {
        name: "   ",
        slug: "contact",
        fields: [],
        submitTo: "email",
      };

      expect(() => CreateFormSchema.parse(data)).toThrow();
    });

    it("trims whitespace from name", () => {
      const data = {
        name: "  Contact Form  ",
        slug: "contact",
        fields: [],
        submitTo: "email",
      };

      const result = CreateFormSchema.parse(data);
      expect(result.name).toBe("Contact Form");
    });

    it("accepts optional fields", () => {
      const data = {
        name: "Contact Form",
        slug: "contact",
        fields: [],
      };

      const result = CreateFormSchema.parse(data);
      expect(result.submitTo).toBe("email");
      expect(result.status).toBe("draft");
    });

    it("rejects max 30 fields", () => {
      const data = {
        name: "Contact Form",
        slug: "contact",
        fields: Array.from({ length: 31 }, (_, i) => ({
          kind: "text" as const,
          label: `Field ${i}`,
        })),
        submitTo: "email",
      };

      expect(() => CreateFormSchema.parse(data)).toThrow();
    });
  });

  describe("UpdateFormSchema", () => {
    it("accepts partial updates", () => {
      const data = {
        name: "Updated Form",
      };

      expect(() => UpdateFormSchema.parse(data)).not.toThrow();
    });

    it("allows empty object", () => {
      const data = {};

      const result = UpdateFormSchema.parse(data);
      expect(Object.keys(result).length).toBe(0);
    });
  });
});
