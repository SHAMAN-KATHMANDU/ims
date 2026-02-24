/**
 * Member Service
 *
 * Single source for member (CRM) API calls. All member HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import { validateExcelFile } from "@/lib/fileValidation";

// ============================================
// Types
// ============================================

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
  _count?: {
    sales: number;
  };
}

export interface MemberWithSales extends Member {
  sales?: {
    id: string;
    saleCode: string;
    total: number;
    createdAt: string;
    location: {
      id: string;
      name: string;
    };
    _count: {
      items: number;
    };
  }[];
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

export interface MemberCheckResult {
  isMember: boolean;
  member: {
    id: string;
    phone: string;
    name?: string;
    isActive: boolean;
  } | null;
}

interface MembersApiResponse {
  message: string;
  data: Member[];
  pagination: PaginationMeta;
}

interface MemberResponse {
  message: string;
  member: Member;
}

interface MemberWithSalesResponse {
  message: string;
  member: MemberWithSales;
}

interface MemberCheckResponse extends MemberCheckResult {
  message?: string;
}

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT };

/**
 * Get all members with pagination and search
 */
export async function getMembers(
  params: MemberListParams = {},
): Promise<PaginatedMembersResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  try {
    const response = await api.get<MembersApiResponse>(
      `/members?${queryParams.toString()}`,
    );
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch members");
  }
}

/**
 * Get member by ID with purchase history
 */
export async function getMemberById(id: string): Promise<MemberWithSales> {
  if (!id?.trim()) {
    throw new Error("Member ID is required");
  }

  try {
    const response = await api.get<{ data?: MemberWithSalesResponse }>(
      `/members/${id}`,
    );
    const member = response.data?.data?.member;
    if (!member) throw new Error("Invalid response from server");
    return member;
  } catch (error) {
    handleApiError(error, `fetch member "${id}"`);
  }
}

/**
 * Get member by phone number
 */
export async function getMemberByPhone(phone: string): Promise<Member> {
  if (!phone?.trim()) {
    throw new Error("Phone number is required");
  }

  try {
    const response = await api.get<{ data?: MemberResponse }>(
      `/members/phone/${encodeURIComponent(phone)}`,
    );
    const member = response.data?.data?.member;
    if (!member) throw new Error("Invalid response from server");
    return member;
  } catch (error) {
    handleApiError(error, `fetch member by phone "${phone}"`);
  }
}

/**
 * Check if phone number is a member (quick lookup for sales)
 */
export async function checkMember(phone: string): Promise<MemberCheckResult> {
  if (!phone?.trim()) {
    return { isMember: false, member: null };
  }

  try {
    const response = await api.get<{ data?: MemberCheckResponse }>(
      `/members/check/${encodeURIComponent(phone)}`,
    );
    return {
      isMember: response.data?.data?.isMember ?? false,
      member: response.data?.data?.member ?? null,
    };
  } catch {
    // If member not found, return false
    return { isMember: false, member: null };
  }
}

/**
 * Create a new member
 */
export async function createMember(data: CreateMemberData): Promise<Member> {
  if (!data.phone?.trim()) {
    throw new Error("Phone number is required");
  }

  try {
    const response = await api.post<{ data?: MemberResponse }>(
      "/members",
      data,
    );
    const member = response.data?.data?.member;
    if (!member) throw new Error("Invalid response from server");
    return member;
  } catch (error) {
    handleApiError(error, "create member");
  }
}

/**
 * Update a member
 */
export async function updateMember(
  id: string,
  data: UpdateMemberData,
): Promise<Member> {
  if (!id?.trim()) {
    throw new Error("Member ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<{ data?: MemberResponse }>(
      `/members/${id}`,
      data,
    );
    const member = response.data?.data?.member;
    if (!member) throw new Error("Invalid response from server");
    return member;
  } catch (error) {
    handleApiError(error, `update member "${id}"`);
  }
}

// ============================================
// Bulk Upload Types
// ============================================

export interface MemberBulkUploadError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface MemberBulkUploadSummary {
  total: number;
  created: number;
  skipped: number;
  errors: number;
}

export interface CreatedMember {
  id: string;
  phone: string;
  name: string | null;
}

export interface SkippedMember {
  phone: string;
  name: string | null;
  reason: string;
}

export interface MemberBulkUploadResponse {
  message: string;
  summary: MemberBulkUploadSummary;
  created: CreatedMember[];
  skipped: SkippedMember[];
  errors: MemberBulkUploadError[];
}

/**
 * Bulk upload members from Excel file
 * @param file - Excel file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 */
export async function bulkUploadMembers(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<MemberBulkUploadResponse> {
  validateExcelFile(file);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<{ data?: MemberBulkUploadResponse }>(
      "/bulk/upload/members",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(progress);
          }
        },
      },
    );

    return ((response.data as { data?: MemberBulkUploadResponse })?.data ??
      response.data) as MemberBulkUploadResponse;
  } catch (error: unknown) {
    const axiosError = error as {
      isAxiosError?: boolean;
      response?: {
        status?: number;
        data?: {
          message?: string;
          missingColumns?: string[];
          hint?: string;
          foundColumns?: string[];
        };
      };
    };
    if (
      axiosError?.isAxiosError &&
      axiosError.response?.status === 400 &&
      axiosError.response?.data
    ) {
      const data = axiosError.response.data;
      const err = new Error(data?.message || "Validation failed") as Error & {
        responseData?: typeof data;
      };
      err.responseData = data;
      throw err;
    }
    handleApiError(error, "bulk upload members");
  }
}

/**
 * Download members as Excel or CSV
 * @param format - Export format: 'excel' or 'csv'
 * @param memberIds - Optional array of member IDs to export. If not provided, exports all members.
 */
export async function downloadMembers(
  format: "excel" | "csv" = "excel",
  memberIds?: string[],
): Promise<void> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("format", format);

    if (memberIds && memberIds.length > 0) {
      queryParams.set("ids", memberIds.join(","));
    }
    queryParams.set("type", "members");

    const response = await api.get<Blob>(
      `/bulk/download?${queryParams.toString()}`,
      { responseType: "blob" },
    );

    const defaultFilename = `members_${new Date().toISOString().split("T")[0]}.${
      format === "excel" ? "xlsx" : "csv"
    }`;
    downloadBlobFromResponse(response, defaultFilename);
  } catch (error) {
    handleApiError(error, "download members");
    throw error;
  }
}

/**
 * Download bulk upload template (Excel with headers only)
 */
export async function downloadBulkUploadTemplate(): Promise<void> {
  try {
    const response = await api.get<Blob>("/bulk/template?type=members", {
      responseType: "blob",
    });
    downloadBlobFromResponse(response, "members_bulk_upload_template.xlsx");
  } catch (error) {
    handleApiError(error, "download template");
    throw error;
  }
}
