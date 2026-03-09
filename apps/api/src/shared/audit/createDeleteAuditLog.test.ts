/**
 * Unit tests for createDeleteAuditLog.
 * Verifies audit log creation and non-fatal failure handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeleteAuditLog } from "./createDeleteAuditLog";

const mockCreate = vi.fn();

vi.mock("@/modules/audit/audit.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

describe("createDeleteAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls audit repository with correct params", async () => {
    mockCreate.mockResolvedValue(undefined);

    await createDeleteAuditLog({
      userId: "u1",
      tenantId: "t1",
      resource: "Product",
      resourceId: "p1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      tenantId: "t1",
      userId: "u1",
      action: "DELETE",
      resource: "Product",
      resourceId: "p1",
      details: undefined,
      ip: undefined,
      userAgent: undefined,
    });
  });

  it("includes deleteReason in details when provided", async () => {
    mockCreate.mockResolvedValue(undefined);

    await createDeleteAuditLog({
      userId: "u1",
      tenantId: "t1",
      resource: "Category",
      resourceId: "c1",
      deleteReason: "Duplicate entry",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { deleteReason: "Duplicate entry" },
      }),
    );
  });

  it("includes ip and userAgent when provided", async () => {
    mockCreate.mockResolvedValue(undefined);

    await createDeleteAuditLog({
      userId: "u1",
      tenantId: "t1",
      resource: "Product",
      resourceId: "p1",
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );
  });

  it("handles null tenantId (platform-level delete)", async () => {
    mockCreate.mockResolvedValue(undefined);

    await createDeleteAuditLog({
      userId: "u1",
      tenantId: null,
      resource: "Tenant",
      resourceId: "t1",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: null,
        resource: "Tenant",
      }),
    );
  });

  it("swallows audit failures and does not throw", async () => {
    mockCreate.mockRejectedValue(new Error("Audit DB unreachable"));

    await expect(
      createDeleteAuditLog({
        userId: "u1",
        tenantId: "t1",
        resource: "Product",
        resourceId: "p1",
      }),
    ).resolves.toBeUndefined();

    expect(mockCreate).toHaveBeenCalled();
  });
});
