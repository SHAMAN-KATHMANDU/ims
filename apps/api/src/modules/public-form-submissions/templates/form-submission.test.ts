import { describe, it, expect } from "vitest";
import {
  renderSubject,
  renderText,
  renderHtml,
  type FormField,
  type FormSubmissionMeta,
} from "./form-submission";

const fields: FormField[] = [
  { label: "Name", value: "Alice Smith" },
  { label: "Email", value: "alice@example.com" },
  { label: "Message", value: "Hello <world> & friends!" },
];

const meta: FormSubmissionMeta = {
  formLabel: "Contact Form",
  submittedAt: new Date("2026-04-29T10:00:00.000Z"),
  submissionId: "sub-123",
  tenantName: "Acme Corp",
};

describe("renderSubject", () => {
  it("includes the form label and UTC date string", () => {
    const subject = renderSubject(meta);
    expect(subject).toContain("Contact Form");
    expect(subject).toContain("2026");
    expect(subject).toContain("UTC");
  });
});

describe("renderText", () => {
  it("includes field labels and values", () => {
    const text = renderText(fields, meta);
    expect(text).toContain("Name: Alice Smith");
    expect(text).toContain("Email: alice@example.com");
  });

  it("includes submission ID", () => {
    const text = renderText(fields, meta);
    expect(text).toContain("sub-123");
  });
});

describe("renderHtml", () => {
  it("is valid HTML containing field data", () => {
    const html = renderHtml(fields, meta);
    expect(html).toContain("Alice Smith");
    expect(html).toContain("alice@example.com");
  });

  it("escapes HTML special characters in field values", () => {
    const html = renderHtml(fields, meta);
    expect(html).toContain("Hello &lt;world&gt; &amp; friends!");
    expect(html).not.toContain("Hello <world>");
  });

  it("includes the tenant name when provided", () => {
    const html = renderHtml(fields, meta);
    expect(html).toContain("Acme Corp");
  });

  it("omits tenant name line when tenantName is undefined", () => {
    const metaNoTenant: FormSubmissionMeta = { ...meta, tenantName: undefined };
    const html = renderHtml(fields, metaNoTenant);
    expect(html).not.toContain("Site:");
  });

  it("includes submission ID in footer", () => {
    const html = renderHtml(fields, meta);
    expect(html).toContain("sub-123");
  });
});
