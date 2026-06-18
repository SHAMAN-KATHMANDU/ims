import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  assignLead,
} from "./lead.service";

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

describe("lead.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Edge case 1: getLeads with all optional params provided
  it("gets leads with all optional filtering and pagination params", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "lead1",
            name: "John Doe",
            email: "john@example.com",
            status: "QUALIFIED",
            assignedToId: "user1",
            createdById: "user2",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        ],
        pagination: {
          currentPage: 2,
          itemsPerPage: 25,
          totalItems: 100,
          totalPages: 4,
          hasNextPage: true,
          hasPrevPage: true,
        },
      },
    });

    const result = await getLeads({
      page: 2,
      limit: 25,
      search: "acme",
      sortBy: "name",
      sortOrder: "desc",
      status: "QUALIFIED",
      source: "website",
      assignedToId: "user1",
    });

    expect(mockGet).toHaveBeenCalledWith("/leads", {
      params: {
        page: 2,
        limit: 25,
        search: "acme",
        sortBy: "name",
        sortOrder: "desc",
        status: "QUALIFIED",
        source: "website",
        assignedToId: "user1",
      },
    });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.itemsPerPage).toBe(25);
  });

  // Edge case 2: getLeads with no params (default empty object)
  it("gets leads with no params (empty filter)", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    });

    const result = await getLeads();

    expect(mockGet).toHaveBeenCalledWith("/leads", { params: {} });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });

  // Edge case 3: getLeadById with special characters in ID
  it("gets lead by id with special characters in url", async () => {
    const specialId = "lead-abc_123.456";
    mockGet.mockResolvedValue({
      data: {
        lead: {
          id: specialId,
          name: "Test Lead",
          status: "NEW",
          assignedToId: "user1",
          createdById: "user2",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      },
    });

    const result = await getLeadById(specialId);

    expect(mockGet).toHaveBeenCalledWith(`/leads/${specialId}`);
    expect(result.lead.id).toBe(specialId);
  });

  // Edge case 4: createLead with minimal data (only required name field)
  it("creates lead with minimal required data only", async () => {
    mockPost.mockResolvedValue({
      data: {
        lead: {
          id: "lead-new",
          name: "Minimal Lead",
          status: "NEW",
          assignedToId: "default-user",
          createdById: "current-user",
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-15T10:00:00Z",
        },
      },
    });

    const result = await createLead({ name: "Minimal Lead" });

    expect(mockPost).toHaveBeenCalledWith("/leads", { name: "Minimal Lead" });
    expect(result.lead.name).toBe("Minimal Lead");
    expect(result.lead.email).toBeUndefined();
  });

  // Edge case 5: createLead with all optional fields populated
  it("creates lead with all optional fields populated", async () => {
    mockPost.mockResolvedValue({
      data: {
        lead: {
          id: "lead-full",
          name: "Full Lead",
          email: "full@example.com",
          phone: "+1-555-1234",
          companyName: "ACME Corp",
          status: "QUALIFIED",
          source: "referral",
          notes: "High priority lead",
          assignedToId: "user-sales-team",
          createdById: "user-admin",
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-15T10:00:00Z",
        },
      },
    });

    const result = await createLead({
      name: "Full Lead",
      email: "full@example.com",
      phone: "+1-555-1234",
      companyName: "ACME Corp",
      status: "QUALIFIED",
      source: "referral",
      notes: "High priority lead",
      assignedToId: "user-sales-team",
    });

    expect(mockPost).toHaveBeenCalledWith("/leads", {
      name: "Full Lead",
      email: "full@example.com",
      phone: "+1-555-1234",
      companyName: "ACME Corp",
      status: "QUALIFIED",
      source: "referral",
      notes: "High priority lead",
      assignedToId: "user-sales-team",
    });
    expect(result.lead.email).toBe("full@example.com");
    expect(result.lead.companyName).toBe("ACME Corp");
  });

  // Edge case 6: updateLead with partial fields (not all fields)
  it("updates lead with only some fields changed", async () => {
    mockPut.mockResolvedValue({
      data: {
        lead: {
          id: "lead1",
          name: "Updated Name",
          email: "updated@example.com",
          phone: "555-9999",
          status: "CONTACTED",
          assignedToId: "user2",
          createdById: "user1",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-15T15:30:00Z",
        },
      },
    });

    const result = await updateLead("lead1", {
      name: "Updated Name",
      status: "CONTACTED",
    });

    expect(mockPut).toHaveBeenCalledWith("/leads/lead1", {
      name: "Updated Name",
      status: "CONTACTED",
    });
    expect(result.lead.name).toBe("Updated Name");
    expect(result.lead.status).toBe("CONTACTED");
  });

  // Edge case 7: deleteLead returns void successfully
  it("deletes lead and returns void", async () => {
    mockDelete.mockResolvedValue(undefined);

    const result = await deleteLead("lead1");

    expect(mockDelete).toHaveBeenCalledWith("/leads/lead1");
    expect(result).toBeUndefined();
  });

  // Edge case 8: convertLead with all optional conversion data
  it("converts lead with all conversion context data", async () => {
    mockPost.mockResolvedValue({
      data: {
        lead: {
          id: "lead1",
          name: "John Doe",
          status: "CONVERTED",
          assignedToId: "user1",
          createdById: "user2",
          convertedAt: "2025-01-15T16:00:00Z",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-15T16:00:00Z",
        },
        contact: { id: "contact-1", name: "John Doe" },
        deal: {
          id: "deal-1",
          name: "ACME Enterprise Contract",
          value: 50000,
          status: "OPEN",
        },
      },
    });

    const result = await convertLead("lead1", {
      contactId: "contact-1",
      dealName: "ACME Enterprise Contract",
      dealValue: 50000,
      pipelineId: "pipeline-1",
    });

    expect(mockPost).toHaveBeenCalledWith("/leads/lead1/convert", {
      contactId: "contact-1",
      dealName: "ACME Enterprise Contract",
      dealValue: 50000,
      pipelineId: "pipeline-1",
    });
    expect(result.lead.status).toBe("CONVERTED");
    expect(result.lead.convertedAt).toBe("2025-01-15T16:00:00Z");
    expect((result.deal as unknown as { value: number }).value).toBe(50000);
  });

  // Edge case 9: convertLead with no conversion data (empty object fallback)
  it("converts lead with no conversion data (empty object fallback)", async () => {
    mockPost.mockResolvedValue({
      data: {
        lead: {
          id: "lead1",
          name: "John Doe",
          status: "CONVERTED",
          assignedToId: "user1",
          createdById: "user2",
          convertedAt: "2025-01-15T16:00:00Z",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-15T16:00:00Z",
        },
        contact: null,
        deal: null,
      },
    });

    const result = await convertLead("lead1");

    expect(mockPost).toHaveBeenCalledWith("/leads/lead1/convert", {});
    expect(result.lead.status).toBe("CONVERTED");
  });

  // Edge case 10: assignLead with different user id
  it("assigns lead to different user", async () => {
    mockPost.mockResolvedValue({
      data: {
        lead: {
          id: "lead1",
          name: "John Doe",
          status: "QUALIFIED",
          assignedToId: "user-new-sales-manager",
          createdById: "user-admin",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-15T17:00:00Z",
        },
      },
    });

    const result = await assignLead("lead1", "user-new-sales-manager");

    expect(mockPost).toHaveBeenCalledWith("/leads/lead1/assign", {
      assignedToId: "user-new-sales-manager",
    });
    expect(result.lead.assignedToId).toBe("user-new-sales-manager");
  });

  // Edge case 11: error handling - axios rejects with error
  it("handles network error when fetching leads", async () => {
    const error = new Error("Network timeout");
    mockGet.mockRejectedValue(error);

    await expect(getLeads()).rejects.toThrow("Network timeout");
    expect(mockGet).toHaveBeenCalledWith("/leads", { params: {} });
  });

  // Edge case 12: nested response unwrapping - getLeadById returns lead object inside data
  it("properly unwraps nested lead object from response", async () => {
    mockGet.mockResolvedValue({
      data: {
        lead: {
          id: "lead1",
          name: "John Doe",
          email: "john@example.com",
          phone: "+1-555-0001",
          companyName: "Acme Inc",
          status: "QUALIFIED",
          source: "inbound",
          notes: "Potential customer",
          assignedToId: "user1",
          createdById: "user2",
          convertedAt: null,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-14T10:00:00Z",
          assignedTo: { id: "user1", username: "john_sales" },
          creator: { id: "user2", username: "admin" },
        },
      },
    });

    const result = await getLeadById("lead1");

    expect(result).toHaveProperty("lead");
    expect(result.lead.id).toBe("lead1");
    expect(result.lead.assignedTo?.username).toBe("john_sales");
    expect(result.lead.creator?.username).toBe("admin");
  });

  // Edge case 13: pagination metadata validation
  it("preserves pagination metadata in list response", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "lead1",
            name: "Lead 1",
            status: "NEW",
            assignedToId: "user1",
            createdById: "user2",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
          {
            id: "lead2",
            name: "Lead 2",
            status: "CONTACTED",
            assignedToId: "user1",
            createdById: "user2",
            createdAt: "2025-01-02T00:00:00Z",
            updatedAt: "2025-01-02T00:00:00Z",
          },
        ],
        pagination: {
          currentPage: 3,
          itemsPerPage: 20,
          totalItems: 250,
          totalPages: 13,
          hasNextPage: true,
          hasPrevPage: true,
        },
      },
    });

    const result = await getLeads({ page: 3, limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.currentPage).toBe(3);
    expect(result.pagination.totalItems).toBe(250);
    expect(result.pagination.totalPages).toBe(13);
  });
});
