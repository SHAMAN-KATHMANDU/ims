/**
 * Tenants feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedTenantsResponse {
  data: Tenant[];
  pagination: PaginationMeta;
}

export interface CreateTenantData {
  name: string;
  slug: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessProfileSocials {
  facebook?: string | null;
  instagram?: string | null;
  x?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
}

/**
 * Mirrors the TenantBusinessProfile Prisma model.
 * All editable fields are nullable; id / tenantId / timestamps are read-only.
 */
export interface BusinessProfile {
  id: string;
  tenantId: string;
  // Identity
  legalName: string | null;
  displayName: string | null;
  tagline: string | null;
  // Media
  logoUrl: string | null;
  faviconUrl: string | null;
  // Contact
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  websiteUrl: string | null;
  // Address
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  mapUrl: string | null;
  // Tax IDs
  panNumber: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  // Defaults
  defaultCurrency: string | null;
  timezone: string | null;
  // Socials (JSON column)
  socials: BusinessProfileSocials | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessProfileData {
  legalName?: string | null;
  displayName?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  websiteUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  mapUrl?: string | null;
  panNumber?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  taxId?: string | null;
  defaultCurrency?: string | null;
  timezone?: string | null;
  socials?: BusinessProfileSocials | null;
}
