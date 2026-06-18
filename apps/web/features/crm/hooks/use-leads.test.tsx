import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetLeads = vi.fn();
const mockGetLeadById = vi.fn();
const mockCreateLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockDeleteLead = vi.fn();
const mockConvertLead = vi.fn();
const mockAssignLead = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/lead.service", () => ({
  getLeads: (...args: unknown[]) => mockGetLeads(...args),
  getLeadById: (...args: unknown[]) => mockGetLeadById(...args),
  createLead: (...args: unknown[]) => mockCreateLead(...args),
  updateLead: (...args: unknown[]) => mockUpdateLead(...args),
  deleteLead: (...args: unknown[]) => mockDeleteLead(...args),
  convertLead: (...args: unknown[]) => mockConvertLead(...args),
  assignLead: (...args: unknown[]) => mockAssignLead(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
  },
}));

vi.mock("./use-contacts", () => ({
  contactKeys: {
    all: ["contacts"] as const,
  },
}));

vi.mock("./use-deals", () => ({
  dealKeys: {
    all: ["deals"] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useLeadsPaginated,
  useLead,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  useAssignLead,
} from "./use-leads";

describe("useLeadsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetLeads.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch leads with default pagination params when no params provided", async () => {
    const { result } = renderHook(() => useLeadsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetLeads).toHaveBeenCalledWith({});
  });

  it("should NOT fetch when CRM feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useLeadsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetLeads).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useLeadsPaginated({}, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetLeads).not.toHaveBeenCalled();
  });

  it("should pass pagination and filter params correctly to getLeads", async () => {
    const params = {
      page: 2,
      limit: 50,
      search: "Acme Corp",
      sortBy: "name",
      sortOrder: "asc" as const,
      status: "QUALIFIED" as const,
      source: "website",
      assignedToId: "user123",
    };
    mockGetLeads.mockResolvedValue({
      data: [{ id: "l1", name: "Acme Corp" }],
      pagination: { page: 2, limit: 50, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useLeadsPaginated(params), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetLeads).toHaveBeenCalledWith(params);
  });

  it("should pass partial params unchanged to service and normalize only in query key", async () => {
    const params = { page: 3, search: "test" };
    mockGetLeads.mockResolvedValue({
      data: [],
      pagination: { page: 3, limit: 20, totalItems: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useLeadsPaginated(params), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetLeads).toHaveBeenCalledWith(params);
  });
});

describe("useLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetLeadById.mockResolvedValue({
      lead: {
        id: "l1",
        name: "Lead 1",
        status: "NEW",
        assignedToId: "u1",
        createdById: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch lead details when id is provided", async () => {
    const { result } = renderHook(() => useLead("l1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetLeadById).toHaveBeenCalledWith("l1");
  });

  it("should NOT fetch when id is empty string", async () => {
    const { result } = renderHook(() => useLead(""), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetLeadById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useLead("l1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetLeadById).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch", async () => {
    const { result } = renderHook(() => useLead("l1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetLeadById).not.toHaveBeenCalled();
  });
});

describe("useCreateLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateLead.mockResolvedValue({
      lead: {
        id: "l1",
        name: "New Lead",
        status: "NEW",
        assignedToId: "u1",
        createdById: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createLead service with correct data shape", async () => {
    const createData = {
      name: "New Lead",
      email: "lead@example.com",
      phone: "555-1234",
      companyName: "Acme Corp",
      status: "NEW" as const,
      source: "website",
      notes: "Test notes",
      assignedToId: "user123",
    };

    const { result } = renderHook(() => useCreateLead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateLead).toHaveBeenCalledWith(createData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateLead(), { wrapper });

    const createData = { name: "New Lead", email: "lead@example.com" };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useUpdateLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockUpdateLead.mockResolvedValue({
      lead: {
        id: "l1",
        name: "Updated Lead",
        status: "QUALIFIED",
        assignedToId: "u1",
        createdById: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateLead with id and data object shape", async () => {
    const { result } = renderHook(() => useUpdateLead(), { wrapper });

    const updatePayload = {
      id: "l1",
      data: {
        name: "Updated Lead",
        status: "QUALIFIED" as const,
        email: "updated@example.com",
      },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateLead).toHaveBeenCalledWith("l1", {
      name: "Updated Lead",
      status: "QUALIFIED",
      email: "updated@example.com",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateLead(), { wrapper });

    const updatePayload = {
      id: "l1",
      data: { name: "Updated" },
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(updatePayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useDeleteLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteLead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteLead service with lead id", async () => {
    const { result } = renderHook(() => useDeleteLead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("l1");
    });

    expect(mockDeleteLead).toHaveBeenCalledWith("l1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteLead(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("l1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useConvertLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockConvertLead.mockResolvedValue({
      lead: {
        id: "l1",
        name: "Converted Lead",
        status: "CONVERTED",
        assignedToId: "u1",
        createdById: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
        convertedAt: "2024-01-02",
      },
      contact: { id: "c1" },
      deal: { id: "d1" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call convertLead with id and optional data object", async () => {
    const { result } = renderHook(() => useConvertLead(), { wrapper });

    const convertPayload = {
      id: "l1",
      data: {
        contactId: "c1",
        dealName: "New Deal",
        dealValue: 50000,
        pipelineId: "p1",
      },
    };

    await act(async () => {
      await result.current.mutateAsync(convertPayload);
    });

    expect(mockConvertLead).toHaveBeenCalledWith("l1", {
      contactId: "c1",
      dealName: "New Deal",
      dealValue: 50000,
      pipelineId: "p1",
    });
  });

  it("should call convertLead with just id when data is not provided", async () => {
    const { result } = renderHook(() => useConvertLead(), { wrapper });

    const convertPayload = {
      id: "l1",
      data: undefined,
    };

    await act(async () => {
      await result.current.mutateAsync(convertPayload);
    });

    expect(mockConvertLead).toHaveBeenCalledWith("l1", undefined);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useConvertLead(), { wrapper });

    const convertPayload = {
      id: "l1",
      data: { contactId: "c1" },
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(convertPayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useAssignLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockAssignLead.mockResolvedValue({
      lead: {
        id: "l1",
        name: "Assigned Lead",
        status: "CONTACTED",
        assignedToId: "u2",
        createdById: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call assignLead with id and assignedToId", async () => {
    const { result } = renderHook(() => useAssignLead(), { wrapper });

    const assignPayload = {
      id: "l1",
      assignedToId: "u2",
    };

    await act(async () => {
      await result.current.mutateAsync(assignPayload);
    });

    expect(mockAssignLead).toHaveBeenCalledWith("l1", "u2");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAssignLead(), { wrapper });

    const assignPayload = {
      id: "l1",
      assignedToId: "u2",
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(assignPayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});
