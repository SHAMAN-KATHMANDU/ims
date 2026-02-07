"use client";

/**
 * React Query wrappers for members. Business logic and API calls live in memberService; hooks only wire query/mutation and cache keys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMembers,
  getMemberById,
  getMemberByPhone,
  checkMember,
  createMember,
  updateMember,
  type Member,
  type MemberWithSales,
  type MemberListParams,
  type PaginatedMembersResponse,
  type CreateMemberData,
  type UpdateMemberData,
  type MemberCheckResult,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/services/memberService";

// Re-export types for convenience
export type {
  Member,
  MemberWithSales,
  MemberListParams,
  PaginatedMembersResponse,
  CreateMemberData,
  UpdateMemberData,
  MemberCheckResult,
};

// Re-export defaults
export { DEFAULT_PAGE, DEFAULT_LIMIT };

// ============================================
// Query Keys
// ============================================

export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: (params: MemberListParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  byPhone: (phone: string) => [...memberKeys.all, "phone", phone] as const,
  check: (phone: string) => [...memberKeys.all, "check", phone] as const,
};

// ============================================
// Member Hooks
// ============================================

/**
 * Hook for fetching paginated members with search and sort
 */
export function useMembersPaginated(params: MemberListParams = {}) {
  const normalizedParams: MemberListParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search?.trim() || "",
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
  };

  return useQuery({
    queryKey: memberKeys.list(normalizedParams),
    queryFn: () => getMembers(normalizedParams),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching a single member by ID with purchase history
 */
export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => getMemberById(id),
    enabled: !!id,
  });
}

/**
 * Hook for fetching a member by phone number
 */
export function useMemberByPhone(phone: string) {
  return useQuery({
    queryKey: memberKeys.byPhone(phone),
    queryFn: () => getMemberByPhone(phone),
    enabled: !!phone?.trim(),
  });
}

/**
 * Hook for checking if a phone number is a member (for sales)
 */
export function useCheckMember(phone: string) {
  return useQuery({
    queryKey: memberKeys.check(phone),
    queryFn: () => checkMember(phone),
    enabled: !!phone?.trim() && phone.length >= 7, // Only check if phone looks valid
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating a new member
 */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberData) => createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.refetchQueries({ queryKey: memberKeys.lists() });
    },
  });
}

/**
 * Hook for updating a member
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemberData }) =>
      updateMember(id, data),
    onSuccess: (updatedMember) => {
      queryClient.setQueryData(
        memberKeys.detail(updatedMember.id),
        updatedMember,
      );
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: memberKeys.byPhone(updatedMember.phone),
      });
      queryClient.refetchQueries({ queryKey: memberKeys.lists() });
    },
  });
}
