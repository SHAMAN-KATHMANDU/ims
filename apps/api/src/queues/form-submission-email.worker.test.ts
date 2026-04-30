/**
 * Unit tests for form-submission-email worker.
 *
 * All external dependencies are mocked so no DB or Redis connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted by Vitest — must be before imports) ─────────────────────

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
  default: { create: vi.fn() },
}));

vi.mock("./queue.config", () => ({
  redisConnection: { host: "localhost", port: 6379 },
  formSubmissionEmailQueue: { add: vi.fn() },
}));

vi.mock("@/config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { basePrisma } from "@/config/prisma";
import { sendEmail } from "@/lib/email/email";
import auditRepository from "@/modules/audit/audit.repository";
import { resolveRecipients } from "./form-submission-email.worker";

const mockPrisma = basePrisma as unknown as {
  formSubmission: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  siteConfig: { findUnique: ReturnType<typeof vi.fn> };
};
const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;
const mockAuditCreate = (
  auditRepository as unknown as { create: ReturnType<typeof vi.fn> }
).create;

// ── resolveRecipients ────────────────────────────────────────────────────────

describe("resolveRecipients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns block-level recipients when valid", async () => {
    const result = await resolveRecipients("t1", [
      "admin@example.com",
      "info@example.com",
    ]);
    expect(result).toEqual(["admin@example.com", "info@example.com"]);
    expect(mockPrisma.siteConfig.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to SiteConfig.contact.email when block list empty", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    const result = await resolveRecipients("t1", []);
    expect(result).toEqual(["owner@example.com"]);
  });

  it("throws when block list empty and SiteConfig has no email", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { phone: "123" },
    });
    await expect(resolveRecipients("t1", [])).rejects.toThrow(
      /No email recipients configured/,
    );
  });

  it("throws when block list empty and SiteConfig is null", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue(null);
    await expect(resolveRecipients("t1", [])).rejects.toThrow(
      /No email recipients configured/,
    );
  });

  it("filters out invalid emails from block recipients before use", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    const result = await resolveRecipients("t1", [
      "not-an-email",
      "valid@example.com",
    ]);
    expect(result).toEqual(["valid@example.com"]);
  });
});

// ── Worker email flow (success) ─────────────────────────────────────────────

describe("Worker email flow — success path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends email to resolved recipients", async () => {
    mockPrisma.siteConfig.findUnique.mockResolvedValue({
      contact: { email: "owner@example.com" },
    });
    mockSendEmail.mockResolvedValue(undefined);

    const recipients = await resolveRecipients("t1", []);
    await sendEmail({
      to: recipients,
      subject: "Test",
      html: "<p>hi</p>",
      text: "hi",
    });

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["owner@example.com"] }),
    );
  });
});

// ── Worker email flow (failure) ─────────────────────────────────────────────

describe("Worker email flow — failure path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records lastError when sendEmail throws", async () => {
    const smtpError = new Error("Connection refused");
    mockSendEmail.mockRejectedValue(smtpError);
    mockPrisma.formSubmission.update.mockResolvedValue({});

    await expect(
      sendEmail({ to: "x@y.com", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow("Connection refused");

    // Simulate the worker's catch block
    await basePrisma.formSubmission.update({
      where: { id: "sub-1" },
      data: { lastError: smtpError.message },
    });

    expect(mockPrisma.formSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastError: "Connection refused" }),
      }),
    );
  });

  it("calls audit repository with FAILED action on error", async () => {
    mockAuditCreate.mockResolvedValue({});

    await auditRepository.create({
      tenantId: "t1",
      userId: "system",
      action: "FORM_SUBMISSION_EMAIL_FAILED",
      resource: "FORM_SUBMISSION",
      resourceId: "sub-fail",
      details: { error: "SMTP error" },
    });

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FORM_SUBMISSION_EMAIL_FAILED",
        resource: "FORM_SUBMISSION",
        resourceId: "sub-fail",
      }),
    );
  });

  it("calls audit repository with SENT action on success", async () => {
    mockAuditCreate.mockResolvedValue({});

    await auditRepository.create({
      tenantId: "t1",
      userId: "system",
      action: "FORM_SUBMISSION_EMAIL_SENT",
      resource: "FORM_SUBMISSION",
      resourceId: "sub-ok",
      details: { recipients: ["r@example.com"] },
    });

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: "FORM_SUBMISSION_EMAIL_SENT" }),
    );
  });
});
