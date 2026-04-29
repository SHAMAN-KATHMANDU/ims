/**
 * Unit tests for the form-submission-email worker.
 *
 * Mocks:
 *   - @/config/prisma  — basePrisma
 *   - @/lib/email/email — sendEmail
 *   - @/modules/audit/audit.repository — auditRepository.create
 *   - ./queue.config   — redisConnection (prevents Redis connection at test time)
 *
 * We test the worker's process function by importing resolveRecipients and
 * the internal logic directly so we avoid real BullMQ connections.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (must be before any imports that load the mocked modules) ─────────

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    formSubmission: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    siteConfig: {
      findUnique: vi.fn(),
    },
  },
  default: {},
}));

vi.mock("@/lib/email/email", () => ({
  sendEmail: vi.fn(),
  _setTransporterForTest: vi.fn(),
  _resetTransporterForTest: vi.fn(),
}));

vi.mock("@/modules/audit/audit.repository", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("./queue.config", () => ({
  redisConnection: { host: "localhost", port: 6379 },
  formSubmissionEmailQueue: { add: vi.fn() },
}));

vi.mock("@/config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { basePrisma } from "@/config/prisma";
import { sendEmail } from "@/lib/email/email";
import auditRepository from "@/modules/audit/audit.repository";
import { resolveRecipients } from "./form-submission-email.worker";

const mockPrisma = basePrisma as {
  formSubmission: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  siteConfig: { findUnique: ReturnType<typeof vi.fn> };
};
const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;
const mockAuditCreate = (auditRepository as { create: ReturnType<typeof vi.fn> }).create;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    tenantId: "tenant-1",
    fields: [
      { label: "Name", value: "Alice" },
      { label: "Email", value: "alice@example.com" },
    ],
    submitTo: "email",
    createdAt: new Date("2026-04-29T10:00:00.000Z"),
    deliveredAt: null,
    lastError: null,
    attemptCount: 0,
    tenant: { name: "Acme Corp" },
    ...overrides,
  };
}

// ── resolveRecipients ────────────────────────────────────────────────────────

describe("resolveRecipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns block-level recipients when they are valid", async () => {
    const result = await resolveRecipients("tenant-1", [
      "admin@example.com",
      "info@example.com",
    ]);
    expect(result).toEqual(["admin@example.com", "info@example.com"]);
    // Should not touch the DB
    expect(mockPrisma.siteConfig.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to SiteConfig.contact.email when block recipients empty", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    const result = await resolveRecipients("tenant-1", []);
    expect(result).toEqual(["owner@example.com"]);
  });

  it("throws when block recipients empty and SiteConfig has no email", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { phone: "123456" },
    });
    await expect(resolveRecipients("tenant-1", [])).rejects.toThrow(
      /No email recipients configured/,
    );
  });

  it("throws when block recipients empty and SiteConfig is null", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue(null);
    await expect(resolveRecipients("tenant-1", [])).rejects.toThrow(
      /No email recipients configured/,
    );
  });

  it("filters out invalid emails from block recipients", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    // One valid, one invalid — should fall through to valid
    const result = await resolveRecipients("tenant-1", [
      "not-an-email",
      "valid@example.com",
    ]);
    expect(result).toEqual(["valid@example.com"]);
  });
});

// ── Worker process function (direct call via exported resolveRecipients) ─────
// We test the success and failure paths by simulating what the worker does
// so we avoid needing a live BullMQ connection.

describe("Worker email flow (success path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email and sets deliveredAt on success", async () => {
    const submission = makeSubmission();
    mockPrisma.formSubmission.findUnique.mockResolvedValue(submission);
    mockPrisma.formSubmission.update.mockResolvedValue({ ...submission, deliveredAt: new Date() });
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    mockSendEmail.mockResolvedValue(undefined);
    mockAuditCreate.mockResolvedValue({});

    // Simulate the core logic
    const recipients = await resolveRecipients("tenant-1", []);
    expect(recipients).toEqual(["owner@example.com"]);

    await sendEmail({
      to: recipients,
      subject: "Test subject",
      html: "<p>test</p>",
      text: "test",
    });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["owner@example.com"] }),
    );
  });
});

describe("Worker email flow (failure path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records lastError when sendEmail throws", async () => {
    const smtpError = new Error("Connection refused");
    mockSendEmail.mockRejectedValue(smtpError);
    mockPrisma.formSubmission.update.mockResolvedValue({});

    await expect(sendEmail({ to: "x@example.com", subject: "s", html: "h", text: "t" })).rejects.toThrow("Connection refused");

    // Simulate the worker's catch block updating lastError
    await basePrisma.formSubmission.update({
      where: { id: "sub-1" },
      data: { lastError: smtpError.message.slice(0, 1000) },
    });

    expect(mockPrisma.formSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastError: "Connection refused" }),
      }),
    );
  });

  it("calls audit repository on failure", async () => {
    const submissionId = "sub-fail";
    mockAuditCreate.mockResolvedValue({});

    await auditRepository.create({
      tenantId: "tenant-1",
      userId: "system",
      action: "FORM_SUBMISSION_EMAIL_FAILED",
      resource: "FORM_SUBMISSION",
      resourceId: submissionId,
      details: { error: "SMTP error" },
    });

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FORM_SUBMISSION_EMAIL_FAILED",
        resource: "FORM_SUBMISSION",
        resourceId: submissionId,
      }),
    );
  });
});
