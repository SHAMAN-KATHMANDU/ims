import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockUseEnvFeatureFlag = vi.fn();
const mockGetCrmSources = vi.fn();
const mockGetCrmJourneyTypes = vi.fn();

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
  createCrmSource: vi.fn(),
  updateCrmSource: vi.fn(),
  deleteCrmSource: vi.fn(),
  getCrmJourneyTypes: (...args: unknown[]) => mockGetCrmJourneyTypes(...args),
  createCrmJourneyType: vi.fn(),
  updateCrmJourneyType: vi.fn(),
  deleteCrmJourneyType: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useCrmJourneyTypes, useCrmSources } from "./use-crm-settings";

describe("use-crm-settings feature gating", () => {
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

  it("does not fetch journey types when caller disables the query", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useCrmJourneyTypes(undefined, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmJourneyTypes).not.toHaveBeenCalled();
  });

  it("fetches sources when pipelines are enabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useCrmSources(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ sources: [] }));
    expect(mockGetCrmSources).toHaveBeenCalledTimes(1);
  });
});
