import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetAutomationDefinitions = vi.fn();
const mockGetAutomationRuns = vi.fn();
const mockCreateAutomationDefinition = vi.fn();
const mockUpdateAutomationDefinition = vi.fn();
const mockArchiveAutomationDefinition = vi.fn();
const mockUseEnvFeatureFlag = vi.fn(() => true);
const mockToast = vi.fn();

vi.mock("../services/automation.service", () => ({
  getAutomationDefinitions: (...args: unknown[]) =>
    mockGetAutomationDefinitions(...args),
  getAutomationRuns: (...args: unknown[]) => mockGetAutomationRuns(...args),
  createAutomationDefinition: (...args: unknown[]) =>
    mockCreateAutomationDefinition(...args),
  updateAutomationDefinition: (...args: unknown[]) =>
    mockUpdateAutomationDefinition(...args),
  archiveAutomationDefinition: (...args: unknown[]) =>
    mockArchiveAutomationDefinition(...args),
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => mockUseEnvFeatureFlag(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import {
  useArchiveAutomationDefinition,
  useAutomationDefinitions,
  useAutomationRuns,
  useCreateAutomationDefinition,
  useUpdateAutomationDefinition,
} from "./use-automation";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

describe("use-automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
  });

  it("loads automation definitions and runs", async () => {
    mockGetAutomationDefinitions.mockResolvedValue({
      automations: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    mockGetAutomationRuns.mockResolvedValue({ runs: [] });

    const { result: definitions } = renderHook(
      () => useAutomationDefinitions({ page: 1, limit: 10 }),
      { wrapper },
    );
    const { result: runs } = renderHook(
      () => useAutomationRuns("auto-1", { limit: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(definitions.current.data).toBeDefined());
    await waitFor(() => expect(runs.current.data).toBeDefined());

    expect(mockGetAutomationDefinitions).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(mockGetAutomationRuns).toHaveBeenCalledWith("auto-1", { limit: 5 });
  });

  it("runs create, update, and archive mutations", async () => {
    mockCreateAutomationDefinition.mockResolvedValue({
      automation: { id: "auto-1" },
    });
    mockUpdateAutomationDefinition.mockResolvedValue({
      automation: { id: "auto-1" },
    });
    mockArchiveAutomationDefinition.mockResolvedValue({ archived: true });

    const { result: createResult } = renderHook(
      () => useCreateAutomationDefinition(),
      { wrapper },
    );
    const { result: updateResult } = renderHook(
      () => useUpdateAutomationDefinition(),
      { wrapper },
    );
    const { result: archiveResult } = renderHook(
      () => useArchiveAutomationDefinition(),
      { wrapper },
    );

    await act(async () => {
      await createResult.current.mutateAsync({
        name: "Restock",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "inventory.stock.low_detected" }],
        steps: [
          {
            actionType: "workitem.create",
            actionConfig: {
              title: "Restock",
              type: "RESTOCK_REQUEST",
              priority: "HIGH",
            },
          },
        ],
      });
      await updateResult.current.mutateAsync({
        id: "auto-1",
        payload: { status: "INACTIVE" },
      });
      await archiveResult.current.mutateAsync("auto-1");
    });

    expect(mockCreateAutomationDefinition).toHaveBeenCalled();
    expect(mockUpdateAutomationDefinition).toHaveBeenCalledWith("auto-1", {
      status: "INACTIVE",
    });
    expect(mockArchiveAutomationDefinition).toHaveBeenCalledWith("auto-1");
    expect(mockToast).toHaveBeenCalled();
  });

  it("does not fetch when automation feature is disabled", async () => {
    mockUseEnvFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAutomationDefinitions(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetAutomationDefinitions).not.toHaveBeenCalled();
  });
});
