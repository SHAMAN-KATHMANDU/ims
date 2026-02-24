/**
 * Shared constants for audit logs, resources, and actions.
 * Use these instead of magic strings where audit/resource names are required.
 */

/** Resource names for audit logs and usage. */
export const AuditResource = {
  PRODUCT: "product",
  SALE: "sale",
  AUTH: "auth",
  USER: "user",
  CONSENT: "consent",
  TRANSFER: "transfer",
} as const;

export type AuditResourceType =
  (typeof AuditResource)[keyof typeof AuditResource];

/** Common audit action names. */
export const AuditAction = {
  CREATE_PRODUCT: "CREATE_PRODUCT",
  UPDATE_PRODUCT: "UPDATE_PRODUCT",
  CREATE_SALE: "CREATE_SALE",
  LOGIN: "LOGIN",
  GDPR_CONSENT_UPDATED: "GDPR_CONSENT_UPDATED",
  GDPR_DELETION_REQUESTED: "GDPR_DELETION_REQUESTED",
  CREATE_TRANSFER: "CREATE_TRANSFER",
  CREATED: "CREATED",
  IN_TRANSIT: "IN_TRANSIT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
