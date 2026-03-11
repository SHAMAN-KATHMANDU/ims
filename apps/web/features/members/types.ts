/**
 * Members feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export interface Member {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  gender?: string;
  age?: number;
  address?: string;
  birthday?: string;
  totalSales?: number;
  memberStatus?: "ACTIVE" | "INACTIVE" | "PROSPECT" | "VIP";
  memberSince?: string | null;
  firstPurchase?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { sales: number };
}

export interface MemberListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedMembersResponse {
  data: Member[];
  pagination: PaginationMeta;
}

export interface CreateMemberData {
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  gender?: string;
  age?: number;
  address?: string;
  birthday?: string;
}

export interface UpdateMemberData {
  phone?: string;
  name?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
  gender?: string;
  age?: number;
  address?: string;
  birthday?: string;
  memberStatus?: "ACTIVE" | "INACTIVE" | "PROSPECT" | "VIP";
}
