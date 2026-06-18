import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDeals,
  getDealsKanban,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
  addDealLineItem,
  removeDealLineItem,
  convertDealToSale,
} from "./deal.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("deal.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: getDeals with all optional filters present
  it("getDeals passes all optional filter params to the API", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "deal1",
            name: "Test Deal",
            value: 10000,
            pipelineId: "p1",
            assignedToId: "u1",
            stage: "Qualified",
            status: "OPEN",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
        pagination: { page: 1, limit: 10, total: 1 },
      },
    });

    const result = await getDeals({
      page: 2,
      limit: 20,
      search: "enterprise",
      sortBy: "value",
      sortOrder: "desc",
      pipelineId: "pipe123",
      stage: "Proposal",
      status: "WON",
      assignedToId: "user456",
      contactId: "contact789",
    });

    expect(mockGet).toHaveBeenCalledWith("/deals", {
      params: {
        page: 2,
        limit: 20,
        search: "enterprise",
        sortBy: "value",
        sortOrder: "desc",
        pipelineId: "pipe123",
        stage: "Proposal",
        status: "WON",
        assignedToId: "user456",
        contactId: "contact789",
      },
    });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
  });

  // Test 2: getDeals with empty params (no filters) - edge case for default behavior
  it("getDeals with no params passes empty params object", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0 },
      },
    });

    const result = await getDeals();

    expect(mockGet).toHaveBeenCalledWith("/deals", { params: {} });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  // Test 3: getDealsKanban with pipelineId - edge case: conditional param
  it("getDealsKanban includes pipelineId when provided", async () => {
    mockGet.mockResolvedValue({
      data: {
        pipeline: { id: "pipe1", name: "Sales" },
        stages: [
          { stage: "Lead", deals: [] },
          {
            stage: "Qualified",
            deals: [
              {
                id: "d1",
                name: "Big Deal",
                value: 50000,
                pipelineId: "pipe1",
                assignedToId: "u1",
                stage: "Qualified",
                status: "OPEN",
                createdAt: "2026-01-01",
                updatedAt: "2026-01-01",
              },
            ],
          },
        ],
        deals: [
          {
            id: "d1",
            name: "Big Deal",
            value: 50000,
            pipelineId: "pipe1",
            assignedToId: "u1",
            stage: "Qualified",
            status: "OPEN",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
      },
    });

    const result = await getDealsKanban("pipe1");

    expect(mockGet).toHaveBeenCalledWith("/deals/kanban", {
      params: { pipelineId: "pipe1" },
    });
    expect(result.stages).toHaveLength(2);
    expect(result.stages[1].deals[0].name).toBe("Big Deal");
  });

  // Test 4: getDealsKanban without pipelineId - edge case: undefined param omitted
  it("getDealsKanban passes empty params when pipelineId is undefined", async () => {
    mockGet.mockResolvedValue({
      data: {
        pipeline: null,
        stages: [],
        deals: [],
      },
    });

    const result = await getDealsKanban();

    expect(mockGet).toHaveBeenCalledWith("/deals/kanban", { params: {} });
    expect(result.stages).toEqual([]);
  });

  // Test 5: getDealById with skipGlobalErrorToast option
  it("getDealById passes skipGlobalErrorToast option to suppress global error toast", async () => {
    const dealData = {
      id: "deal123",
      name: "Strategic Partnership",
      value: 150000,
      stage: "Negotiation",
      status: "OPEN" as const,
      probability: 75,
      pipelineId: "pipe1",
      assignedToId: "u1",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      contact: {
        id: "c1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        purchaseCount: 5,
      },
    };

    mockGet.mockResolvedValue({ data: { deal: dealData } });

    const result = await getDealById("deal123");

    expect(mockGet).toHaveBeenCalledWith("/deals/deal123", {
      skipGlobalErrorToast: true,
    });
    expect(result.deal.id).toBe("deal123");
    expect(result.deal.contact?.firstName).toBe("John");
  });

  // Test 6: createDeal with minimal required fields - edge case: sparse data
  it("createDeal with minimal data (only name required)", async () => {
    mockPost.mockResolvedValue({
      data: {
        deal: {
          id: "new-deal-1",
          name: "Small Opportunity",
          value: 0,
          stage: "default",
          status: "OPEN",
          pipelineId: "default-pipe",
          assignedToId: "default-user",
          createdAt: "2026-01-15",
          updatedAt: "2026-01-15",
        },
      },
    });

    const result = await createDeal({ name: "Small Opportunity" });

    expect(mockPost).toHaveBeenCalledWith("/deals", {
      name: "Small Opportunity",
    });
    expect(result.deal.name).toBe("Small Opportunity");
  });

  // Test 7: createDeal with all optional fields - edge case: complete payload
  it("createDeal with all optional fields populated", async () => {
    mockPost.mockResolvedValue({
      data: {
        deal: {
          id: "full-deal-1",
          name: "Enterprise Contract",
          value: 500000,
          stage: "Proposal",
          status: "OPEN",
          expectedCloseDate: "2026-03-31",
          contactId: "contact1",
          memberId: "member1",
          companyId: "company1",
          pipelineId: "pipe-enterprise",
          assignedToId: "user-senior",
          createdAt: "2026-01-15",
          updatedAt: "2026-01-15",
        },
      },
    });

    const result = await createDeal({
      name: "Enterprise Contract",
      value: 500000,
      stage: "Proposal",
      expectedCloseDate: "2026-03-31",
      contactId: "contact1",
      memberId: "member1",
      companyId: "company1",
      pipelineId: "pipe-enterprise",
      assignedToId: "user-senior",
    });

    expect(mockPost).toHaveBeenCalledWith("/deals", {
      name: "Enterprise Contract",
      value: 500000,
      stage: "Proposal",
      expectedCloseDate: "2026-03-31",
      contactId: "contact1",
      memberId: "member1",
      companyId: "company1",
      pipelineId: "pipe-enterprise",
      assignedToId: "user-senior",
    });
    expect(result.deal.value).toBe(500000);
  });

  // Test 8: updateDeal with partial update - edge case: selective field updates
  it("updateDeal updates only specific fields, omitting others", async () => {
    mockPut.mockResolvedValue({
      data: {
        deal: {
          id: "deal-to-update",
          name: "Updated Deal Name",
          value: 100000,
          stage: "Negotiation",
          status: "OPEN",
          pipelineId: "pipe1",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-20",
        },
      },
    });

    const result = await updateDeal("deal-to-update", {
      name: "Updated Deal Name",
      stage: "Negotiation",
    });

    expect(mockPut).toHaveBeenCalledWith("/deals/deal-to-update", {
      name: "Updated Deal Name",
      stage: "Negotiation",
    });
    expect(result.deal.stage).toBe("Negotiation");
  });

  // Test 9: updateDeal to mark as WON with related fields
  it("updateDeal can transition deal status to WON", async () => {
    mockPut.mockResolvedValue({
      data: {
        deal: {
          id: "won-deal",
          name: "Closed Sale",
          value: 250000,
          stage: "Closed",
          status: "WON",
          pipelineId: "pipe1",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-25",
          closedAt: "2026-01-25",
        },
      },
    });

    const result = await updateDeal("won-deal", {
      status: "WON",
    });

    expect(mockPut).toHaveBeenCalledWith("/deals/won-deal", {
      status: "WON",
    });
    expect(result.deal.status).toBe("WON");
  });

  // Test 10: updateDeal to mark as LOST with loss reason
  it("updateDeal can transition deal to LOST with reason", async () => {
    mockPut.mockResolvedValue({
      data: {
        deal: {
          id: "lost-deal",
          name: "Lost Opportunity",
          value: 75000,
          stage: "Closed",
          status: "LOST",
          lostReason: "Budget constraints on client side",
          pipelineId: "pipe1",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-22",
        },
      },
    });

    const result = await updateDeal("lost-deal", {
      status: "LOST",
      lostReason: "Budget constraints on client side",
    });

    expect(mockPut).toHaveBeenCalledWith("/deals/lost-deal", {
      status: "LOST",
      lostReason: "Budget constraints on client side",
    });
    expect(result.deal.status).toBe("LOST");
    expect(result.deal.lostReason).toBe("Budget constraints on client side");
  });

  // Test 11: updateDealStage with pipelineId - edge case: cross-pipeline stage update
  it("updateDealStage updates stage and includes pipelineId when provided", async () => {
    mockPatch.mockResolvedValue({
      data: {
        deal: {
          id: "stage-updated-deal",
          name: "Moved Deal",
          value: 100000,
          stage: "Proposal",
          status: "OPEN",
          pipelineId: "pipe2",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-20",
        },
      },
    });

    const result = await updateDealStage("stage-updated-deal", {
      stage: "Proposal",
      pipelineId: "pipe2",
    });

    expect(mockPatch).toHaveBeenCalledWith("/deals/stage-updated-deal/stage", {
      stage: "Proposal",
      pipelineId: "pipe2",
    });
    expect(result.deal.stage).toBe("Proposal");
  });

  // Test 12: updateDealStage without pipelineId - edge case: stage-only update
  it("updateDealStage with only stage (no pipelineId)", async () => {
    mockPatch.mockResolvedValue({
      data: {
        deal: {
          id: "simple-stage-update",
          name: "Updated Stage",
          value: 100000,
          stage: "Qualified",
          status: "OPEN",
          pipelineId: "pipe1",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-20",
        },
      },
    });

    const result = await updateDealStage("simple-stage-update", {
      stage: "Qualified",
    });

    expect(mockPatch).toHaveBeenCalledWith("/deals/simple-stage-update/stage", {
      stage: "Qualified",
    });
    expect(result.deal.stage).toBe("Qualified");
  });

  // Test 13: deleteDeal returns void
  it("deleteDeal calls DELETE endpoint and returns void", async () => {
    mockDelete.mockResolvedValue(undefined);

    const result = await deleteDeal("deal-to-delete");

    expect(mockDelete).toHaveBeenCalledWith("/deals/deal-to-delete");
    expect(result).toBeUndefined();
  });

  // Test 14: addDealLineItem with complete data - edge case: full line item
  it("addDealLineItem with all fields (productId, variationId, quantity, unitPrice)", async () => {
    mockPost.mockResolvedValue({
      data: {
        item: {
          id: "li-1",
          productId: "prod-abc",
          variationId: "var-123",
          quantity: 5,
          unitPrice: 250,
          product: {
            id: "prod-abc",
            name: "Premium Service",
            imsCode: "PREM-001",
          },
          variation: { id: "var-123" },
        },
      },
    });

    const result = await addDealLineItem("deal1", {
      productId: "prod-abc",
      variationId: "var-123",
      quantity: 5,
      unitPrice: 250,
    });

    expect(mockPost).toHaveBeenCalledWith("/deals/deal1/line-items", {
      productId: "prod-abc",
      variationId: "var-123",
      quantity: 5,
      unitPrice: 250,
    });
    expect(result.item.id).toBe("li-1");
    expect(result.item.quantity).toBe(5);
  });

  // Test 15: addDealLineItem with minimal data - edge case: only productId
  it("addDealLineItem with only productId (minimal required field)", async () => {
    mockPost.mockResolvedValue({
      data: {
        item: {
          id: "li-2",
          productId: "prod-xyz",
          variationId: null,
          quantity: 1,
          unitPrice: 100,
          product: {
            id: "prod-xyz",
            name: "Standard Product",
            imsCode: "STD-001",
          },
          variation: null,
        },
      },
    });

    const result = await addDealLineItem("deal1", {
      productId: "prod-xyz",
    });

    expect(mockPost).toHaveBeenCalledWith("/deals/deal1/line-items", {
      productId: "prod-xyz",
    });
    expect(result.item.quantity).toBe(1);
  });

  // Test 16: removeDealLineItem - edge case: nested resource deletion
  it("removeDealLineItem calls DELETE with both dealId and lineItemId in path", async () => {
    mockDelete.mockResolvedValue(undefined);

    const result = await removeDealLineItem("deal1", "li-1");

    expect(mockDelete).toHaveBeenCalledWith("/deals/deal1/line-items/li-1");
    expect(result).toBeUndefined();
  });

  // Test 17: convertDealToSale - edge case: complex response transformation
  it("convertDealToSale converts deal to sale and returns sale metadata", async () => {
    mockPost.mockResolvedValue({
      data: {
        sale: {
          id: "sale-001",
          saleCode: "SALE-2026-001",
          total: 500000,
        },
      },
    });

    const result = await convertDealToSale(
      "deal-to-convert",
      "location-primary",
    );

    expect(mockPost).toHaveBeenCalledWith(
      "/deals/deal-to-convert/convert-to-sale",
      { locationId: "location-primary" },
    );
    expect(result.sale.id).toBe("sale-001");
    expect(result.sale.saleCode).toBe("SALE-2026-001");
    expect(result.sale.total).toBe(500000);
  });

  // Test 18: Error propagation when API call fails - edge case: rejection handling
  it("getDealById rejects when API call fails, without handleApiError", async () => {
    const error = new Error("Deal not found");
    mockGet.mockRejectedValue(error);

    await expect(getDealById("nonexistent-id")).rejects.toThrow(
      "Deal not found",
    );
    expect(mockGet).toHaveBeenCalledWith("/deals/nonexistent-id", {
      skipGlobalErrorToast: true,
    });
  });

  // Test 19: Special characters in deal ID - edge case: URL-safe ID encoding
  it("API methods correctly handle deal IDs with special characters", async () => {
    mockGet.mockResolvedValue({
      data: {
        deal: {
          id: "deal-with-special-chars-123_abc",
          name: "Test",
          value: 1000,
          stage: "Lead",
          status: "OPEN",
          pipelineId: "pipe1",
          assignedToId: "u1",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      },
    });

    await getDealById("deal-with-special-chars-123_abc");

    expect(mockGet).toHaveBeenCalledWith(
      "/deals/deal-with-special-chars-123_abc",
      { skipGlobalErrorToast: true },
    );
  });

  // Test 20: getDeals handles empty result set - edge case: zero deals edge case
  it("getDeals correctly returns empty data array and pagination metadata for zero results", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      },
    });

    const result = await getDeals({ search: "nonexistent-deal" });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});
