/**
 * Shared helper to create an audit log entry for delete actions.
 * Call after successful soft delete. Audit failure is non-fatal.
 */

import auditRepository from "@/modules/audit/audit.repository";

export interface CreateDeleteAuditLogParams {
  userId: string;
  tenantId: string | null;
  resource: string;
  resourceId: string;
  deleteReason?: string | null;
  ip?: string;
  userAgent?: string;
}

export async function createDeleteAuditLog(
  params: CreateDeleteAuditLogParams,
): Promise<void> {
  try {
    await auditRepository.create({
      tenantId: params.tenantId,
      userId: params.userId,
      action: "DELETE",
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.deleteReason
        ? { deleteReason: params.deleteReason }
        : undefined,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  } catch {
    // Audit log failure is non-fatal — do not fail the delete operation
  }
}
