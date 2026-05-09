export interface TenantDomain {
  id: string;
  tenantId: string;
  hostname: string;
  isPrimary: boolean;
  verifiedAt: string | null;
  sslStatus: "pending" | "valid" | "expired";
  sslExpiresAt: string | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainVerificationInstructions {
  domainId: string;
  aRecordName: string;
  aRecordValue: string | null;
  txtName: string;
  txtValue: string;
}
