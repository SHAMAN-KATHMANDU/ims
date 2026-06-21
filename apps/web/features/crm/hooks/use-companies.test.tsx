import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetCompanies = vi.fn();
const mockGetCompanyById = vi.fn();
const mockCreateCompany = vi.fn();
const mockUpdateCompany = vi.fn();
const mockDeleteCompany = vi.fn();
const mockListCompaniesForSelect = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/company.service", () => ({
  getCompanies: (...args: unknown[]) => mockGetCompanies(...args),
  getCompanyById: (...args: unknown[]) => mockGetCompanyById(...args),
  createCompany: (...args: unknown[]) => mockCreateCompany(...args),
  updateCompany: (...args: unknown[]) => mockUpdateCompany(...args),
  deleteCompany: (...args: unknown[]) => mockDeleteCompany(...args),
  listCompaniesForSelect: (...args: unknown[]) =>
    mockListCompaniesForSelect(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useCompaniesPaginated,
  useCompany,
  useCompaniesForSelect,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  companyKeys,
} from "./use-companies";

describe("useCompaniesPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetCompanies.mockResolvedValue({
      data: [
        {
          id: "c1",
          name: "Acme Corp",
          website: "https://acme.com",
          address: "123 Main St",
          phone: "555-1234",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });
  });

  it("calls getCompanies with normalized default params", async () => {
    const { result } = renderHook(
      () => useCompaniesPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCompanies).toHaveBeenCalled();
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0]!.name).toBe("Acme Corp");
  });

  it("does not fetch when SALES_PIPELINE feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(
      () => useCompaniesPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCompanies).not.toHaveBeenCalled();
  });

  it("respects enabled:false option even when feature is enabled", async () => {
    const { result } = renderHook(
      () => useCompaniesPaginated({ page: 1, limit: 10 }, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCompanies).not.toHaveBeenCalled();
  });

  it("passes search and sort params to getCompanies", async () => {
    mockGetCompanies.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    });

    const { result } = renderHook(
      () =>
        useCompaniesPaginated({
          page: 2,
          limit: 20,
          search: "tech",
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCompanies).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: "tech",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("uses placeholder data behavior for pagination", async () => {
    mockGetCompanies.mockResolvedValue({
      data: [{ id: "c1", name: "Company 1" }],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(
      ({ params }) => useCompaniesPaginated(params),
      { wrapper, initialProps: { params: { page: 1, limit: 10 } } },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0]!.name).toBe("Company 1");
  });
});

describe("useCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetCompanyById.mockResolvedValue({
      company: {
        id: "c1",
        name: "Acme Corp",
        website: "https://acme.com",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  it("calls getCompanyById with provided id", async () => {
    const { result } = renderHook(() => useCompany("c1"), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetCompanyById).toHaveBeenCalledWith("c1");
    expect(result.current.data?.company.name).toBe("Acme Corp");
  });

  it("does not fetch when id is empty/falsy", async () => {
    const { result } = renderHook(() => useCompany(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCompanyById).not.toHaveBeenCalled();
  });

  it("does not fetch when SALES_PIPELINE feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCompany("c1"), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCompanyById).not.toHaveBeenCalled();
  });

  it("respects enabled:false option", async () => {
    const { result } = renderHook(() => useCompany("c1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetCompanyById).not.toHaveBeenCalled();
  });
});

describe("useCompaniesForSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockListCompaniesForSelect.mockResolvedValue({
      companies: [
        { id: "c1", name: "Company 1" },
        { id: "c2", name: "Company 2" },
      ],
    });
  });

  it("calls listCompaniesForSelect and returns companies", async () => {
    const { result } = renderHook(() => useCompaniesForSelect(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockListCompaniesForSelect).toHaveBeenCalled();
    expect(result.current.data?.companies).toHaveLength(2);
    expect(result.current.data?.companies[0]!.name).toBe("Company 1");
  });

  it("does not fetch when feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCompaniesForSelect(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockListCompaniesForSelect).not.toHaveBeenCalled();
  });

  it("respects enabled:false option", async () => {
    const { result } = renderHook(
      () => useCompaniesForSelect({ enabled: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockListCompaniesForSelect).not.toHaveBeenCalled();
  });
});

describe("useCreateCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateCompany.mockResolvedValue({
      company: {
        id: "c1",
        name: "New Company",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  it("calls createCompany with correct data shape", async () => {
    const createData = {
      name: "New Company",
      website: "https://example.com",
      address: "123 Main St",
      phone: "555-1234",
    };
    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateCompany).toHaveBeenCalledWith(createData);
  });

  it("throws error when feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    const createData = { name: "New Company" };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("mutation error propagates correctly", async () => {
    const error = new Error("API Error");
    mockCreateCompany.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    const createData = { name: "New Company" };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("API Error");
  });

  it("invalidates list and select queries on success", async () => {
    mockCreateCompany.mockResolvedValue({
      company: {
        id: "c1",
        name: "New Company",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });

    const { result } = renderHook(() => useCreateCompany(), { wrapper });

    const createData = { name: "New Company" };

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateCompany).toHaveBeenCalledWith(createData);
  });
});

describe("useUpdateCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockUpdateCompany.mockResolvedValue({
      company: {
        id: "c1",
        name: "Updated Company",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });
  });

  it("calls updateCompany with id and data in correct shape", async () => {
    const updateData = { name: "Updated Company", website: "https://new.com" };
    const { result } = renderHook(() => useUpdateCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "c1", data: updateData });
    });

    expect(mockUpdateCompany).toHaveBeenCalledWith("c1", updateData);
  });

  it("throws error when feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateCompany(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          id: "c1",
          data: { name: "Updated" },
        });
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("mutation error propagates correctly", async () => {
    const error = new Error("Update failed");
    mockUpdateCompany.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateCompany(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          id: "c1",
          data: { name: "Updated" },
        });
      }),
    ).rejects.toThrow("Update failed");
  });

  it("invalidates list, detail and select queries on success", async () => {
    mockUpdateCompany.mockResolvedValue({
      company: {
        id: "c1",
        name: "Updated Company",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    });

    const { result } = renderHook(() => useUpdateCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "c1",
        data: { name: "Updated" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteCompany.mockResolvedValue(undefined);
  });

  it("calls deleteCompany with id", async () => {
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("c1");
    });

    expect(mockDeleteCompany).toHaveBeenCalledWith("c1");
  });

  it("throws error when feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("c1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("mutation error propagates correctly", async () => {
    const error = new Error("Delete failed");
    mockDeleteCompany.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("c1");
      }),
    ).rejects.toThrow("Delete failed");
  });

  it("invalidates list and select queries on success", async () => {
    mockDeleteCompany.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteCompany(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("c1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("companyKeys", () => {
  it("generates correct query key for lists", () => {
    const key = companyKeys.lists();
    expect(key).toEqual(["companies", "list"]);
  });

  it("generates correct query key for detail", () => {
    const key = companyKeys.detail("c1");
    expect(key).toEqual(["companies", "detail", "c1"]);
  });

  it("generates correct query key for select", () => {
    const key = companyKeys.select();
    expect(key).toEqual(["companies", "select"]);
  });
});
