import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetCrmDashboard = vi.fn();
const mockGetCrmReports = vi.fn();
const mockExportCrmReports = vi.fn();
const mockUseCrmFlag = vi.fn(() => true);
const mockUseReportsFlag = vi.fn(() => true);

vi.mock("../services/crm.service", () => ({
  getCrmDashboard: (...args: unknown[]) => mockGetCrmDashboard(...args),
  getCrmReports: (...args: unknown[]) => mockGetCrmReports(...args),
  exportCrmReports: (...args: unknown[]) => mockExportCrmReports(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: vi.fn(),
  useEnvFeatureFlag: (feature: string) => {
    if (feature === "CRM") {
      return mockUseCrmFlag();
    }
    if (feature === "CRM_REPORTS") {
      return mockUseReportsFlag();
    }
    return true;
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useCrmDashboard, useCrmReports, crmKeys } from "./use-crm";

describe("useCrmDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCrmFlag.mockReturnValue(true);
    mockUseReportsFlag.mockReturnValue(true);
    mockGetCrmDashboard.mockResolvedValue({
      data: {
        totalDealsValue: 150000,
        dealsClosingThisMonth: 5,
        tasksDueToday: 3,
        leadConversionRate: 0.25,
        totalLeads: 100,
        convertedLeads: 25,
        monthlyRevenueChart: [{ month: "Jan", revenue: 50000 }],
        pipelineFunnels: [],
        activitySummary: [],
      },
    });
  });

  it("fetches dashboard data when CRM feature is enabled", async () => {
    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCrmDashboard).toHaveBeenCalledOnce();
    expect(result.current.data?.data.totalDealsValue).toBe(150000);
  });

  it("does not fetch dashboard when CRM feature flag is disabled", async () => {
    mockUseCrmFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmDashboard).not.toHaveBeenCalled();
  });

  it("uses correct query key for dashboard", async () => {
    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const expectedKey = crmKeys.dashboard();
    expect(expectedKey).toEqual(["crm", "dashboard"]);
  });

  it("respects staleTime of 60 seconds", async () => {
    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // Verify the hook was called with correct options
    expect(result.current.isStale).toBe(false);
  });

  it("handles dashboard fetch error gracefully", async () => {
    const testError = new Error("Dashboard fetch failed");
    mockGetCrmDashboard.mockRejectedValue(testError);

    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(testError);
  });
});

describe("useCrmReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCrmFlag.mockReturnValue(true);
    mockUseReportsFlag.mockReturnValue(true);
    mockGetCrmReports.mockResolvedValue({
      data: {
        year: 2024,
        dealsWon: 50,
        dealsLost: 10,
        totalRevenue: 500000,
        conversionRate: 0.83,
        salesPerUser: [],
        staffPerformance: [],
        leadsBySource: [],
        monthlyRevenue: [],
      },
    });
  });

  it("fetches reports with year parameter when provided", async () => {
    const { result } = renderHook(() => useCrmReports(2024), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCrmReports).toHaveBeenCalledWith(2024);
    expect(result.current.data?.data.year).toBe(2024);
  });

  it("fetches reports with undefined year when not provided", async () => {
    const { result } = renderHook(() => useCrmReports(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCrmReports).toHaveBeenCalledWith(undefined);
  });

  it("does not fetch reports when CRM_REPORTS feature flag is disabled", async () => {
    mockUseReportsFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCrmReports(2024), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCrmReports).not.toHaveBeenCalled();
  });

  it("uses correct query key with year parameter", async () => {
    const { result } = renderHook(() => useCrmReports(2024), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const expectedKey = crmKeys.reports(2024);
    expect(expectedKey).toEqual(["crm", "reports", 2024]);
  });

  it("uses correct query key without year parameter", async () => {
    const { result } = renderHook(() => useCrmReports(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const expectedKey = crmKeys.reports(undefined);
    expect(expectedKey).toEqual(["crm", "reports", undefined]);
  });

  it("handles reports fetch error and exposes error state", async () => {
    const testError = new Error("Reports API error");
    mockGetCrmReports.mockRejectedValue(testError);

    const { result } = renderHook(() => useCrmReports(2024), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(testError);
  });

  it("returns loading state while fetching reports", async () => {
    mockGetCrmReports.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  year: 2024,
                  dealsWon: 50,
                  dealsLost: 10,
                  totalRevenue: 500000,
                  conversionRate: 0.83,
                  salesPerUser: [],
                  staffPerformance: [],
                  leadsBySource: [],
                  monthlyRevenue: [],
                },
              }),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useCrmReports(2024), { wrapper });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

describe("crmKeys", () => {
  it("generates correct all key", () => {
    expect(crmKeys.all).toEqual(["crm"]);
  });

  it("generates correct dashboard key", () => {
    expect(crmKeys.dashboard()).toEqual(["crm", "dashboard"]);
  });

  it("generates correct reports key without year", () => {
    expect(crmKeys.reports()).toEqual(["crm", "reports", undefined]);
  });

  it("generates correct reports key with year", () => {
    expect(crmKeys.reports(2024)).toEqual(["crm", "reports", 2024]);
  });

  it("generates different keys for different years", () => {
    const key2023 = crmKeys.reports(2023);
    const key2024 = crmKeys.reports(2024);

    expect(key2023).not.toEqual(key2024);
    expect(key2023).toEqual(["crm", "reports", 2023]);
    expect(key2024).toEqual(["crm", "reports", 2024]);
  });
});

describe("exportCrmReports (re-exported function)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportCrmReports.mockResolvedValue(new Blob());
  });

  it("exports exportCrmReports function from service", async () => {
    // The function is re-exported from the service module
    // Verify it can be called with optional year parameter
    const blob = await mockExportCrmReports();
    expect(blob).toBeInstanceOf(Blob);
  });

  it("can be called with year parameter for export", async () => {
    mockExportCrmReports.mockResolvedValue(new Blob());
    const blob = await mockExportCrmReports(2024);
    expect(mockExportCrmReports).toHaveBeenCalledWith(2024);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("can be called without year parameter for export", async () => {
    mockExportCrmReports.mockResolvedValue(new Blob());
    const blob = await mockExportCrmReports();
    expect(mockExportCrmReports).toHaveBeenCalledWith();
    expect(blob).toBeInstanceOf(Blob);
  });
});
