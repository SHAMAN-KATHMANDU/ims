import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetAuditLogs = vi.fn();
const mockGetErrorReports = vi.fn();
const mockCreateErrorReport = vi.fn();

vi.mock("../services/audit.service", () => ({
  getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
}));

vi.mock("../services/error-report.service", () => ({
  getErrorReports: (...args: unknown[]) => mockGetErrorReports(...args),
  createErrorReport: (...args: unknown[]) => mockCreateErrorReport(...args),
  updateErrorReportStatus: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useAuditLogs,
  useErrorReports,
  useCreateErrorReport,
} from "./use-settings";

describe("useAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuditLogs.mockResolvedValue({ logs: [] });
  });

  it("calls getAuditLogs", async () => {
    const { result } = renderHook(() => useAuditLogs(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetAuditLogs).toHaveBeenCalled();
  });
});

describe("useErrorReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetErrorReports.mockResolvedValue({ reports: [] });
  });

  it("calls getErrorReports", async () => {
    const { result } = renderHook(() => useErrorReports(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetErrorReports).toHaveBeenCalled();
  });
});

describe("useCreateErrorReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateErrorReport.mockResolvedValue({ id: "er1" });
  });

  it("calls createErrorReport on mutation", async () => {
    const createData = { title: "Error", description: "Stack trace: ..." };
    const { result } = renderHook(() => useCreateErrorReport(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateErrorReport).toHaveBeenCalledWith(createData);
  });
});
