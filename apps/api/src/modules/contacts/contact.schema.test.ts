import { describe, it, expect } from "vitest";
import {
  addContactCommunicationSchema,
  addContactNoteSchema,
  contactExportQuerySchema,
  contactIdParamsSchema,
  contactListQuerySchema,
  createContactSchema,
  createTagSchema,
  updateContactSchema,
} from "./contact.schema";

describe("contact schemas", () => {
  it("validates createContactSchema and trims fields", () => {
    const parsed = createContactSchema.parse({
      firstName: "  Roshan ",
      email: "  roshan@example.com ",
      tagIds: ["tag-1", "tag-2"],
    });

    expect(parsed.firstName).toBe("Roshan");
    expect(parsed.email).toBe("roshan@example.com");
    expect(parsed.tagIds).toEqual(["tag-1", "tag-2"]);
  });

  it("rejects empty first name for createContactSchema", () => {
    const result = createContactSchema.safeParse({
      firstName: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateContactSchema with partial fields", () => {
    const parsed = updateContactSchema.parse({
      phone: " 9800000000 ",
      lastName: null,
    });

    expect(parsed.phone).toBe("9800000000");
    expect(parsed.lastName).toBeNull();
  });

  it("validates createTagSchema", () => {
    const parsed = createTagSchema.parse({ name: " VIP " });
    expect(parsed.name).toBe("VIP");
  });

  it("validates addContactNoteSchema", () => {
    const parsed = addContactNoteSchema.parse({ content: " Met at expo " });
    expect(parsed.content).toBe("Met at expo");
  });

  it("validates communication type and rejects invalid values", () => {
    const ok = addContactCommunicationSchema.safeParse({ type: "EMAIL" });
    expect(ok.success).toBe(true);

    const bad = addContactCommunicationSchema.safeParse({ type: "SMS" });
    expect(bad.success).toBe(false);
  });

  it("validates contact params/list/export query schemas", () => {
    const params = contactIdParamsSchema.parse({ id: "contact-1" });
    const listQuery = contactListQuerySchema.parse({
      page: "1",
      limit: "10",
      sortBy: "firstName",
      sortOrder: "asc",
    });
    const exportQuery = contactExportQuerySchema.parse({
      ids: "c1,c2,c3",
    });

    expect(params.id).toBe("contact-1");
    expect(listQuery.page).toBe(1);
    expect(listQuery.sortBy).toBe("firstName");
    expect(exportQuery.ids).toBe("c1,c2,c3");
  });
});
