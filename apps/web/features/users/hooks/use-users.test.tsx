import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetAllUsers = vi.fn();
const mockCreateUser = vi.fn();

vi.mock("../services/user.service", () => ({
  getAllUsers: (...args: unknown[]) => mockGetAllUsers(...args),
  getUserById: vi.fn(),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { UserRole } from "@repo/shared";
import { useUsers, useCreateUser } from "./use-users";

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllUsers.mockResolvedValue({ users: [], pagination: {} });
  });

  it("calls getAllUsers", async () => {
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetAllUsers).toHaveBeenCalled();
  });
});

describe("useCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUser.mockResolvedValue({ id: "u1", username: "newuser" });
  });

  it("calls createUser on mutation", async () => {
    const createData = {
      username: "newuser",
      password: "pass123",
      role: UserRole.USER,
    };
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateUser).toHaveBeenCalledWith(createData);
  });
});
