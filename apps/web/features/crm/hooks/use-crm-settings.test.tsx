import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockUseEnvFeatureFlag = vi.fn();
const mockGetCrmSources = vi.fn();
const mockGetCrmJourneyTypes = vi.fn();
const mockCreateCrmSource = vi.fn();
const mockUpdateCrmSource = vi.fn();
const mockDeleteCrmSource = vi.fn();
const mockCreateCrmJourneyType = vi.fn();
const mockUpdateCrmJourneyType = vi.fn();
const mockDeleteCrmJourneyType = vi.fn();

vi.mock("@/features/flags", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/flags")>(
      "@/features/flags",
    );
  return {
    ...actual,
    useEnvFeatureFlag: (...args: unknown[]) => mockUseEnvFeatureFlag(...args),
  };
});

vi.mock("../services/crm-settings.service", () => ({
  getCrmSources: (...args: unknown[]) => mockGetCrmSources(...args),
  createCrmSource: (...args: unknown[]) => mockCreateCrmSource(...args),
  updateCrmSource: (...args: unknown[]) => mockUpdateCrmSource(...args),
  deleteCrmSource: (...args: unknown[]) => mockDeleteCrmSource(...args),
  getCrmJourneyTypes: (...args: unknown[]) => mockGetCrmJourneyTypes(...args),
  createCrmJourneyType: (...args: unknown[]) =>
    mockCreateCrmJourneyType(...args),
  updateCrmJourneyType: (...args: unknown[]) =>
    mockUpdateCrmJourneyType(...args),
  deleteCrmJourneyType: (...args: unknown[]) =>
    mockDeleteCrmJourneyType(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useCrmJourneyTypes,
  useCrmSources,
  useCreateCrmSource,
  useUpdateCrmSource,
  useDeleteCrmSource,
  useCreateCrmJourneyType,
  useUpdateCrmJourneyType,
  useDeleteCrmJourneyType,
} from "./use-crm-settings";

describe("useCrmSources query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCrmSources.mockResolvedValue({ sources: [] });
    mockGetCrmJourneyTypes.mockResolvedValue({ journeyTypes: [] });
  });

  it("does not fetch sources when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCrmSources(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmSources).not.toHaveBeenCalled();
  });

  it("fetches sources when pipelines are enabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useCrmSources(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ sources: [] }));
    expect(mockGetCrmSources).toHaveBeenCalledTimes(1);
  });

  it("passes query params to getCrmSources", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const params = { page: 2, limit: 50, search: "acme" };

    const { result } = renderHook(() => useCrmSources(params), { wrapper });

    await waitFor(() => expect(mockGetCrmSources).toHaveBeenCalled());
    expect(mockGetCrmSources).toHaveBeenCalledWith(params);
  });

  it("respects the enabled option to disable query", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useCrmSources(undefined, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmSources).not.toHaveBeenCalled();
  });

  it("returns error when getCrmSources fails", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const error = new Error("Network error");
    mockGetCrmSources.mockRejectedValue(error);

    const { result } = renderHook(() => useCrmSources(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });
});

describe("useCrmJourneyTypes query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCrmJourneyTypes.mockResolvedValue({ journeyTypes: [] });
  });

  it("does not fetch journey types when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCrmJourneyTypes(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmJourneyTypes).not.toHaveBeenCalled();
  });

  it("fetches journey types when pipelines are enabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useCrmJourneyTypes(), { wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual({ journeyTypes: [] }),
    );
    expect(mockGetCrmJourneyTypes).toHaveBeenCalledTimes(1);
  });

  it("does not fetch journey types when caller disables the query", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useCrmJourneyTypes(undefined, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmJourneyTypes).not.toHaveBeenCalled();
  });

  it("passes query params to getCrmJourneyTypes", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const params = { page: 1, limit: 25, search: "leads" };

    const { result } = renderHook(() => useCrmJourneyTypes(params), {
      wrapper,
    });

    await waitFor(() => expect(mockGetCrmJourneyTypes).toHaveBeenCalled());
    expect(mockGetCrmJourneyTypes).toHaveBeenCalledWith(params);
  });

  it("returns error when getCrmJourneyTypes fails", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const error = new Error("Server error");
    mockGetCrmJourneyTypes.mockRejectedValue(error);

    const { result } = renderHook(() => useCrmJourneyTypes(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });
});

describe("useCreateCrmSource mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCrmSource.mockResolvedValue({
      source: { id: "s1", name: "New Source", createdAt: "2024-01-01" },
    });
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateCrmSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("New Source");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls createCrmSource with correct argument shape", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useCreateCrmSource(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Referral");
    });

    expect(mockCreateCrmSource).toHaveBeenCalledWith("Referral");
    expect(mockCreateCrmSource).toHaveBeenCalledTimes(1);
  });

  it("propagates service errors", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const error = new Error("Creation failed");
    mockCreateCrmSource.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateCrmSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("Bad Source");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Creation failed");
      }
    });
  });

  it("calls service with a simple string argument (not an object)", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockCreateCrmSource.mockResolvedValue({
      source: { id: "s1", name: "Direct", createdAt: "2024-01-01" },
    });

    const { result } = renderHook(() => useCreateCrmSource(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Direct Source Name");
    });

    expect(mockCreateCrmSource).toHaveBeenCalledWith("Direct Source Name");
    expect(mockCreateCrmSource.mock.calls[0][0]).not.toHaveProperty("name");
  });
});

describe("useUpdateCrmSource mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCrmSource.mockResolvedValue({
      source: { id: "s1", name: "Updated", createdAt: "2024-01-01" },
    });
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateCrmSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: "s1", name: "New Name" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls updateCrmSource with correct argument shape", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useUpdateCrmSource(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "s1", name: "Partner" });
    });

    expect(mockUpdateCrmSource).toHaveBeenCalledWith("s1", "Partner");
    expect(mockUpdateCrmSource).toHaveBeenCalledTimes(1);
  });

  it("propagates service errors from updateCrmSource", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const error = new Error("Update failed");
    mockUpdateCrmSource.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateCrmSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: "s1", name: "Invalid" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Update failed");
      }
    });
  });
});

describe("useDeleteCrmSource mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCrmSource.mockResolvedValue(undefined);
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteCrmSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("s1");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls deleteCrmSource with correct id", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useDeleteCrmSource(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("s1");
    });

    expect(mockDeleteCrmSource).toHaveBeenCalledWith("s1");
    expect(mockDeleteCrmSource).toHaveBeenCalledTimes(1);
  });
});

describe("useCreateCrmJourneyType mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCrmJourneyType.mockResolvedValue({
      journeyType: { id: "j1", name: "New Journey", createdAt: "2024-01-01" },
    });
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateCrmJourneyType(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("New Journey");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls createCrmJourneyType with correct argument", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useCreateCrmJourneyType(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Onboarding");
    });

    expect(mockCreateCrmJourneyType).toHaveBeenCalledWith("Onboarding");
    expect(mockCreateCrmJourneyType).toHaveBeenCalledTimes(1);
  });

  it("propagates service errors", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);
    const error = new Error("Journey creation failed");
    mockCreateCrmJourneyType.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateCrmJourneyType(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("Bad Journey");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Journey creation failed");
      }
    });
  });
});

describe("useUpdateCrmJourneyType mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCrmJourneyType.mockResolvedValue({
      journeyType: { id: "j1", name: "Updated", createdAt: "2024-01-01" },
    });
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateCrmJourneyType(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: "j1", name: "New Name" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls updateCrmJourneyType with correct argument shape", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useUpdateCrmJourneyType(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "j1", name: "Renewal" });
    });

    expect(mockUpdateCrmJourneyType).toHaveBeenCalledWith("j1", "Renewal");
    expect(mockUpdateCrmJourneyType).toHaveBeenCalledTimes(1);
  });
});

describe("useDeleteCrmJourneyType mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCrmJourneyType.mockResolvedValue(undefined);
  });

  it("throws error when pipelines are disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteCrmJourneyType(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("j1");
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe(
          "CRM pipeline settings are disabled",
        );
      }
    });
  });

  it("calls deleteCrmJourneyType with correct id", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useDeleteCrmJourneyType(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("j1");
    });

    expect(mockDeleteCrmJourneyType).toHaveBeenCalledWith("j1");
    expect(mockDeleteCrmJourneyType).toHaveBeenCalledTimes(1);
  });
});
