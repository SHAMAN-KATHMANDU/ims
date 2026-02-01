/**
 * Member Service
 *
 * Service layer for member (CRM) management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import { useAuthStore } from "@/stores/auth-store";

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
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

/**
 * Get all members with pagination and search
 */
export async function getMembers(
  params: MemberListParams = {},
): Promise<PaginatedMembersResponse> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search = "" } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }

  try {
    const response = await api.get<MembersApiResponse>(
      `/members?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
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
    const response = await api.get<MemberWithSalesResponse>(`/members/${id}`);
    return response.data.member;
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
    const response = await api.get<MemberResponse>(
      `/members/phone/${encodeURIComponent(phone)}`,
    );
    return response.data.member;
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
    const response = await api.get<MemberCheckResponse>(
      `/members/check/${encodeURIComponent(phone)}`,
    );
    return {
      isMember: response.data.isMember,
      member: response.data.member,
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
    const response = await api.post<MemberResponse>("/members", data);
    return response.data.member;
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
    const response = await api.put<MemberResponse>(`/members/${id}`, data);
    return response.data.member;
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
  if (!file) {
    throw new Error("File is required");
  }

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
  ];
  const allowedExtensions = [".xlsx", ".xls", ".xlsm"];
  const fileExtension = file.name
    .substring(file.name.lastIndexOf("."))
    .toLowerCase();

  if (
    !allowedTypes.includes(file.type) &&
    !allowedExtensions.includes(fileExtension)
  ) {
    throw new Error(
      "Invalid file type. Only Excel files (.xlsx, .xls, .xlsm) are allowed.",
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB limit");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const token = useAuthStore.getState().token;

    const response = await api.post<MemberBulkUploadResponse>(
      "/members/bulk-upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
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

    return response.data;
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

    // Get token for manual header setting
    const token = useAuthStore.getState().token;

    const response = await api.get(
      `/members/download?${queryParams.toString()}`,
      {
        responseType: "blob",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    // Get filename from Content-Disposition header or generate one
    const contentDisposition = response.headers["content-disposition"];
    let filename = `members_${new Date().toISOString().split("T")[0]}.${
      format === "excel" ? "xlsx" : "csv"
    }`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    // Trigger browser download using native API
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
    const token = useAuthStore.getState().token;
    const response = await api.get("/members/bulk-upload/template", {
      responseType: "blob",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const contentDisposition = response.headers["content-disposition"];
    let filename = "members_bulk_upload_template.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/i);
      if (match?.[1]) filename = match[1];
    }
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    handleApiError(error, "download template");
    throw error;
  }
}
