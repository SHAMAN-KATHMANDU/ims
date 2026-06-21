import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  listCompaniesForSelect,
  type Company,
  type CreateCompanyData,
  type UpdateCompanyData,
} from "./company.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("company.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== EDGE CASE 1: getCompanies with all optional params specified =====
  it("getCompanies: passes all query params correctly when provided", async () => {
    const mockResponse = {
      data: {
        data: [
          {
            id: "c1",
            name: "Acme Corp",
            website: "acme.com",
            createdAt: "2024-01-01",
            updatedAt: "2024-01-02",
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    };
    mockGet.mockResolvedValue(mockResponse);

    const result = await getCompanies({
      page: 2,
      limit: 25,
      search: "Acme",
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(mockGet).toHaveBeenCalledWith("/companies", {
      params: {
        page: 2,
        limit: 25,
        search: "Acme",
        sortBy: "name",
        sortOrder: "asc",
      },
    });
    expect(result).toEqual(mockResponse.data);
    expect(result.data).toHaveLength(1);
    expect(result.pagination.currentPage).toBe(1);
  });

  // ===== EDGE CASE 2: getCompanies with NO params (default empty object) =====
  it("getCompanies: handles no params (defaults to empty object)", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const result = await getCompanies();

    expect(mockGet).toHaveBeenCalledWith("/companies", { params: {} });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });

  // ===== EDGE CASE 3: getCompanies with zero results (empty array) =====
  it("getCompanies: correctly unwraps empty response", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const result = await getCompanies({ page: 5, limit: 50 });

    expect(result.data).toEqual([]);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.totalItems).toBe(0);
  });

  // ===== EDGE CASE 4: getCompanyById with special characters in ID =====
  it("getCompanyById: builds correct URL with special characters in ID", async () => {
    const companyId = "c-123-abc_xyz";
    const mockCompany: Company = {
      id: companyId,
      name: "Test Company",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
    };

    mockGet.mockResolvedValue({
      data: { company: mockCompany },
    });

    const result = await getCompanyById(companyId);

    expect(mockGet).toHaveBeenCalledWith(`/companies/${companyId}`);
    expect(result.company.id).toBe(companyId);
  });

  // ===== EDGE CASE 5: getCompanyById returns company with all optional fields null =====
  it("getCompanyById: unwraps response and handles null optional fields", async () => {
    mockGet.mockResolvedValue({
      data: {
        company: {
          id: "c2",
          name: "No Data Corp",
          website: null,
          address: null,
          phone: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
        },
      },
    });

    const result = await getCompanyById("c2");

    expect(result.company.website).toBeNull();
    expect(result.company.address).toBeNull();
    expect(result.company.phone).toBeNull();
    expect(result.company.name).toBe("No Data Corp");
  });

  // ===== EDGE CASE 6: createCompany with minimal required fields only =====
  it("createCompany: sends minimal required data (name only)", async () => {
    const createData: CreateCompanyData = { name: "New Corp" };
    mockPost.mockResolvedValue({
      data: {
        company: {
          id: "c-new",
          name: "New Corp",
          createdAt: "2024-02-01",
          updatedAt: "2024-02-01",
        },
      },
    });

    const result = await createCompany(createData);

    expect(mockPost).toHaveBeenCalledWith("/companies", { name: "New Corp" });
    expect(result.company.id).toBe("c-new");
    expect(result.company.name).toBe("New Corp");
  });

  // ===== EDGE CASE 7: createCompany with all optional fields populated =====
  it("createCompany: sends all fields when provided", async () => {
    const createData: CreateCompanyData = {
      name: "Full Company",
      website: "https://example.com",
      address: "123 Main St",
      phone: "+1-555-0123",
    };

    mockPost.mockResolvedValue({
      data: {
        company: {
          id: "c-full",
          ...createData,
          createdAt: "2024-02-01",
          updatedAt: "2024-02-01",
        },
      },
    });

    const result = await createCompany(createData);

    expect(mockPost).toHaveBeenCalledWith("/companies", createData);
    expect(result.company.website).toBe("https://example.com");
    expect(result.company.address).toBe("123 Main St");
    expect(result.company.phone).toBe("+1-555-0123");
  });

  // ===== EDGE CASE 8: updateCompany with partial update (only one field) =====
  it("updateCompany: sends partial update with only changed fields", async () => {
    const updateData: UpdateCompanyData = { name: "Updated Name" };

    mockPut.mockResolvedValue({
      data: {
        company: {
          id: "c1",
          name: "Updated Name",
          website: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-02-02",
        },
      },
    });

    const result = await updateCompany("c1", updateData);

    expect(mockPut).toHaveBeenCalledWith("/companies/c1", {
      name: "Updated Name",
    });
    expect(result.company.name).toBe("Updated Name");
    expect(result.company.updatedAt).toBe("2024-02-02");
  });

  // ===== EDGE CASE 9: updateCompany with all fields (update multiple fields) =====
  it("updateCompany: sends all update fields when modifying multiple properties", async () => {
    const updateData: UpdateCompanyData = {
      name: "New Name",
      website: "newsite.com",
      address: "456 Oak Ave",
      phone: "+1-555-9999",
    };

    mockPut.mockResolvedValue({
      data: {
        company: {
          id: "c3",
          ...updateData,
          createdAt: "2024-01-01",
          updatedAt: "2024-02-05",
        },
      },
    });

    const result = await updateCompany("c3", updateData);

    expect(mockPut).toHaveBeenCalledWith("/companies/c3", updateData);
    expect(result.company.name).toBe("New Name");
    expect(result.company.website).toBe("newsite.com");
  });

  // ===== EDGE CASE 10: deleteCompany returns void (no data) =====
  it("deleteCompany: makes DELETE request and returns void", async () => {
    mockDelete.mockResolvedValue(undefined);

    const result = await deleteCompany("c-to-delete");

    expect(mockDelete).toHaveBeenCalledWith("/companies/c-to-delete");
    expect(result).toBeUndefined();
  });

  // ===== EDGE CASE 11: listCompaniesForSelect returns dropdown list format =====
  it("listCompaniesForSelect: returns simplified list for dropdown (id and name only)", async () => {
    mockGet.mockResolvedValue({
      data: {
        companies: [
          { id: "c1", name: "Company A" },
          { id: "c2", name: "Company B" },
          { id: "c3", name: "Company C" },
        ],
      },
    });

    const result = await listCompaniesForSelect();

    expect(mockGet).toHaveBeenCalledWith("/companies/list");
    expect(result.companies).toHaveLength(3);
    expect(result.companies[0]).toEqual({ id: "c1", name: "Company A" });
    // Ensure response only has id and name (no extra fields)
    expect(result.companies[0]).not.toHaveProperty("website");
    expect(result.companies[0]).not.toHaveProperty("createdAt");
  });

  // ===== EDGE CASE 12: listCompaniesForSelect with empty list =====
  it("listCompaniesForSelect: handles empty companies list", async () => {
    mockGet.mockResolvedValue({
      data: {
        companies: [],
      },
    });

    const result = await listCompaniesForSelect();

    expect(result.companies).toEqual([]);
    expect(mockGet).toHaveBeenCalledWith("/companies/list");
  });

  // ===== EDGE CASE 13: getCompanies with special search string (SQL-like, special chars) =====
  it("getCompanies: passes through complex search strings without modification", async () => {
    const complexSearch = "'; DROP TABLE companies; --";

    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    await getCompanies({ search: complexSearch });

    expect(mockGet).toHaveBeenCalledWith("/companies", {
      params: {
        search: complexSearch,
      },
    });
  });

  // ===== EDGE CASE 14: getCompanyById with URL path encoded ID =====
  it("getCompanyById: correctly builds URL with encoded ID characters", async () => {
    const idWithSlash = "c/123"; // Simulate ID that might need encoding

    mockGet.mockResolvedValue({
      data: {
        company: {
          id: idWithSlash,
          name: "Test",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      },
    });

    await getCompanyById(idWithSlash);

    expect(mockGet).toHaveBeenCalledWith(`/companies/${idWithSlash}`);
  });

  // ===== EDGE CASE 15: getCompanies preserves sortOrder direction (asc vs desc) =====
  it("getCompanies: preserves sort order direction (asc/desc) in params", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    await getCompanies({ sortBy: "name", sortOrder: "desc" });

    expect(mockGet).toHaveBeenCalledWith("/companies", {
      params: {
        sortBy: "name",
        sortOrder: "desc",
      },
    });
  });

  // ===== EDGE CASE 16: Company response includes _count metadata =====
  it("getCompanyById: returns company with optional _count field (contacts and deals)", async () => {
    mockGet.mockResolvedValue({
      data: {
        company: {
          id: "c-with-count",
          name: "Company With Metadata",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
          _count: { contacts: 5, deals: 3 },
        },
      },
    });

    const result = await getCompanyById("c-with-count");

    expect(result.company._count).toBeDefined();
    expect(result.company._count?.contacts).toBe(5);
    expect(result.company._count?.deals).toBe(3);
  });

  // ===== EDGE CASE 17: API error propagation - getCompanies throws error =====
  it("getCompanies: propagates axios error when request fails", async () => {
    const error = new Error("Network timeout");
    mockGet.mockRejectedValue(error);

    await expect(getCompanies()).rejects.toThrow("Network timeout");
  });

  // ===== EDGE CASE 18: API error propagation - createCompany throws error =====
  it("createCompany: propagates axios error on validation or server error", async () => {
    const validationError = new Error("Validation failed");
    mockPost.mockRejectedValue(validationError);

    await expect(createCompany({ name: "" })).rejects.toThrow(
      "Validation failed",
    );
  });

  // ===== EDGE CASE 19: updateCompany with empty object (no changes) =====
  it("updateCompany: handles update request with no fields changed", async () => {
    const emptyUpdate: UpdateCompanyData = {};

    mockPut.mockResolvedValue({
      data: {
        company: {
          id: "c1",
          name: "Original Name",
          createdAt: "2024-01-01",
          updatedAt: "2024-02-02",
        },
      },
    });

    const result = await updateCompany("c1", emptyUpdate);

    expect(mockPut).toHaveBeenCalledWith("/companies/c1", {});
    expect(result.company.name).toBe("Original Name");
  });

  // ===== EDGE CASE 20: deleteCompany error handling =====
  it("deleteCompany: propagates error when deletion fails", async () => {
    const deleteError = new Error("Company not found");
    mockDelete.mockRejectedValue(deleteError);

    await expect(deleteCompany("nonexistent")).rejects.toThrow(
      "Company not found",
    );
  });
});
