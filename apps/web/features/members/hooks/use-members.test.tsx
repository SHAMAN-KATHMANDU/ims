import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetMembers = vi.fn();
const mockCreateMember = vi.fn();

vi.mock("../services/member.service", () => ({
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
  getMemberById: vi.fn(),
  getMemberByPhone: vi.fn(),
  checkMember: vi.fn(),
  createMember: (...args: unknown[]) => mockCreateMember(...args),
  updateMember: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useMembersPaginated, useCreateMember } from "./use-members";

describe("useMembersPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMembers.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getMembers with normalized params", async () => {
    const { result } = renderHook(
      () => useMembersPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetMembers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreateMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMember.mockResolvedValue({ id: "m1", name: "Member 1" });
  });

  it("calls createMember on mutation", async () => {
    const createData = { name: "John", phone: "+1234567890" };
    const { result } = renderHook(() => useCreateMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateMember).toHaveBeenCalledWith(createData);
  });
});
