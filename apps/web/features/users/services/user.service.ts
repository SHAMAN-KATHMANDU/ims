/**
 * User Service
 *
 * Service layer for user management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { type UserRoleType } from "@repo/shared";

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  username: string;
  role: UserRoleType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  role: UserRoleType;
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  role?: UserRoleType;
}

interface UsersResponse {
  message: string;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface UserResponse {
  message: string;
  user: User;
}

// ============================================
// API Functions
// ============================================

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  role?: string;
}

export interface UsersResult {
  users: User[];
  pagination: UsersResponse["pagination"];
}

/**
 * Get all users (superAdmin only). Pass page/limit for dropdowns (e.g. { page: 1, limit: 100 }).
 */
export async function getAllUsers(
  params?: GetAllUsersParams,
): Promise<UsersResult> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.set("page", String(params.page));
    if (params?.limit != null) queryParams.set("limit", String(params.limit));
    if (params?.sortBy != null) queryParams.set("sortBy", params.sortBy);
    if (params?.sortOrder != null)
      queryParams.set("sortOrder", params.sortOrder);
    if (params?.search != null) queryParams.set("search", params.search);
    if (params?.role != null) queryParams.set("role", params.role);
    const query = queryParams.toString();
    const url = query ? `/users?${query}` : "/users";
    const response = await api.get<UsersResponse>(url);
    return {
      users: response.data.data ?? [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch users");
  }
}

/**
 * Get user by ID (superAdmin only)
 */
export async function getUserById(id: string): Promise<User> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }

  try {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data.user;
  } catch (error) {
    handleApiError(error, `fetch user "${id}"`);
  }
}

/**
 * Create a new user (superAdmin only)
 */
export async function createUser(data: CreateUserData): Promise<User> {
  if (!data.username?.trim()) {
    throw new Error("Username is required");
  }
  if (!data.password) {
    throw new Error("Password is required");
  }
  if (!data.role) {
    throw new Error("Role is required");
  }

  try {
    const response = await api.post<UserResponse>("/users", data);
    return response.data.user;
  } catch (error) {
    handleApiError(error, "create user");
  }
}

/**
 * Update a user (superAdmin only)
 */
export async function updateUser(
  id: string,
  data: UpdateUserData,
): Promise<User> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error("Update data is required");
  }

  try {
    const response = await api.put<UserResponse>(`/users/${id}`, data);
    return response.data.user;
  } catch (error) {
    handleApiError(error, `update user "${id}"`);
  }
}

/**
 * Delete a user (superAdmin only)
 */
export async function deleteUser(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("User ID is required");
  }

  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    handleApiError(error, `delete user "${id}"`);
  }
}

/**
 * Change user password (superAdmin only — no current-password verification at API level)
 */
export async function changePassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  if (!userId?.trim()) {
    throw new Error("User ID is required");
  }
  if (!newPassword) {
    throw new Error("New password is required");
  }

  try {
    await api.put(`/users/${userId}`, { password: newPassword });
  } catch (error) {
    handleApiError(error, "change password");
  }
}

// ─── Password Reset Requests (superAdmin only) ─────────────────────────────────

export type PasswordResetStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED";

export interface PasswordResetRequest {
  id: string;
  tenantId: string;
  requestedById: string;
  status: PasswordResetStatus;
  createdAt: string;
  requestedBy: { id: string; username: string; role: string };
  tenant: { id: string; name: string; slug: string };
}

export interface GetPasswordResetRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PasswordResetRequestsResponse {
  requests: PasswordResetRequest[];
  pagination?: import("@/lib/apiTypes").PaginationMeta;
}

export async function getPasswordResetRequests(
  params?: GetPasswordResetRequestsParams,
): Promise<PasswordResetRequestsResponse> {
  try {
    const response = await api.get<PasswordResetRequestsResponse>(
      "/users/password-reset-requests",
      { params },
    );
    return {
      requests: response.data.requests ?? [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch password reset requests");
  }
}

export async function approvePasswordResetRequest(
  requestId: string,
  newPassword: string,
): Promise<void> {
  try {
    await api.post(`/users/password-reset-requests/${requestId}/approve`, {
      newPassword,
    });
  } catch (error) {
    handleApiError(error, "approve password reset");
  }
}

export async function escalatePasswordResetRequest(
  requestId: string,
): Promise<void> {
  try {
    await api.post(`/users/password-reset-requests/${requestId}/escalate`);
  } catch (error) {
    handleApiError(error, "escalate password reset");
  }
}

export async function rejectPasswordResetRequest(
  requestId: string,
): Promise<void> {
  try {
    await api.post(`/users/password-reset-requests/${requestId}/reject`);
  } catch (error) {
    handleApiError(error, "reject password reset");
  }
}
