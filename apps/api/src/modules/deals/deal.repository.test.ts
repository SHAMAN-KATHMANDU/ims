/**
 * Unit tests for DealRepository — create, findById, createDealRevision, createDeleteRevision.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreate,
  mockFindFirst,
  mockFindMany,
  mockCount,
  txDealFindFirst,
  txDealUpdate,
  txDealCreate,
  mockTransaction,
} = vi.hoisted(() => {
  const txDealFindFirst = vi.fn();
  const txDealUpdate = vi.fn();
  const txDealCreate = vi.fn();
  return {
    mockCreate: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    txDealFindFirst,
    txDealUpdate,
    txDealCreate,
    mockTransaction: vi.fn(
      (
        fn: (tx: {
          deal: {
            findFirst: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
          };
        }) => Promise<unknown>,
      ) =>
        fn({
          deal: {
            findFirst: txDealFindFirst,
            update: txDealUpdate,
            create: txDealCreate,
          },
        }),
    ),
  };
});

vi.mock("@/config/prisma", () => ({
  default: {
    deal: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      update: vi.fn(),
    },
    $transaction: (fn: unknown) =>
      mockTransaction(fn as (tx: unknown) => Promise<unknown>),
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn().mockReturnValue({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    search: undefined,
  }),
  createPaginationResult: vi.fn((data: unknown, total: number) => ({
    data,
    pagination: { totalItems: total, currentPage: 1, totalPages: 1 },
  })),
  getPrismaOrderBy: vi.fn().mockReturnValue({ createdAt: "desc" }),
}));

import dealRepository, { DEAL_LIST_INCLUDE } from "./deal.repository";

describe("DealRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findAll list payload", () => {
    it("projects pipeline with id/name/type instead of full row", async () => {
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      await dealRepository.findAll("t1", {});

      expect(DEAL_LIST_INCLUDE.pipeline).toEqual({
        select: { id: true, name: true, type: true },
      });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            pipeline: { select: { id: true, name: true, type: true } },
          }),
        }),
      );
    });

    it("keeps existing selects on contact/member/company/assignedTo", async () => {
      mockCount.mockResolvedValue(0);
      mockFindMany.mockResolvedValue([]);

      await dealRepository.findAll("t1", {});

      const call = mockFindMany.mock.calls[0][0];
      expect(call.include.contact.select).toEqual({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        purchaseCount: true,
      });
      expect(call.include.member.select).toEqual({
        id: true,
        name: true,
        phone: true,
        email: true,
      });
      expect(call.include.company.select).toEqual({ id: true, name: true });
      expect(call.include.assignedTo.select).toEqual({
        id: true,
        username: true,
      });
    });
  });

  describe("findById", () => {
    it("queries with tenantId, id, deletedAt: null, and isLatest: true", async () => {
      mockFindFirst.mockResolvedValue({ id: "d1", name: "Deal 1" });

      const result = await dealRepository.findById("t1", "d1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "d1",
            tenantId: "t1",
            deletedAt: null,
            isLatest: true,
          }),
        }),
      );
      expect(result?.id).toBe("d1");
    });
  });

  describe("createDealRevision", () => {
    it("marks parent isLatest false and creates new deal with revision metadata and copied line items", async () => {
      const parent = {
        id: "parent-1",
        tenantId: "t1",
        name: "Deal",
        value: 100,
        stage: "Lead",
        probability: 50,
        status: "OPEN" as const,
        expectedCloseDate: null,
        closedAt: null,
        lostReason: null,
        contactId: null,
        memberId: null,
        companyId: null,
        pipelineId: "p1",
        assignedToId: "u1",
        createdById: "u1",
        leadId: null,
        revisionNo: 1,
        lineItems: [
          { productId: "prod1", variationId: null, quantity: 2, unitPrice: 10 },
        ],
      };
      const newDeal = {
        id: "new-1",
        name: "Updated Deal",
        revisionNo: 2,
        isLatest: true,
        parentDealId: "parent-1",
      };
      txDealFindFirst.mockResolvedValue(parent);
      txDealUpdate.mockResolvedValue(undefined);
      txDealCreate.mockResolvedValue(newDeal);

      const result = await dealRepository.createDealRevision(
        "parent-1",
        "t1",
        { name: "Updated Deal" },
        "u2",
        "Corrected name",
      );

      expect(mockTransaction).toHaveBeenCalled();
      expect(txDealFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "parent-1",
            tenantId: "t1",
            deletedAt: null,
            isLatest: true,
          },
          include: { lineItems: true },
        }),
      );
      expect(txDealUpdate).toHaveBeenCalledWith({
        where: { id: "parent-1" },
        data: { isLatest: false },
      });
      expect(txDealCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Updated Deal",
            tenantId: "t1",
            parentDealId: "parent-1",
            revisionNo: 2,
            isLatest: true,
            editedById: "u2",
            editReason: "Corrected name",
            lineItems: {
              create: [
                {
                  productId: "prod1",
                  variationId: null,
                  quantity: 2,
                  unitPrice: 10,
                },
              ],
            },
          }),
        }),
      );
      expect(result).toEqual(newDeal);
    });

    it("uses updates.pipelineId on new revision when provided", async () => {
      const parent = {
        id: "parent-1",
        tenantId: "t1",
        name: "Deal",
        value: 100,
        stage: "Lead",
        probability: 50,
        status: "OPEN" as const,
        expectedCloseDate: null,
        closedAt: null,
        lostReason: null,
        contactId: null,
        memberId: null,
        companyId: null,
        pipelineId: "p1",
        assignedToId: "u1",
        createdById: "u1",
        leadId: null,
        revisionNo: 1,
        lineItems: [] as [],
      };
      const newDeal = { id: "new-1", pipelineId: "p2", revisionNo: 2 };
      txDealFindFirst.mockResolvedValue(parent);
      txDealUpdate.mockResolvedValue(undefined);
      txDealCreate.mockResolvedValue(newDeal);

      await dealRepository.createDealRevision(
        "parent-1",
        "t1",
        {
          pipelineId: "p2",
          stage: "Qualification",
        },
        "u1",
        null,
      );

      expect(txDealCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pipelineId: "p2",
            stage: "Qualification",
          }),
        }),
      );
    });

    it("returns null when parent deal not found", async () => {
      txDealFindFirst.mockResolvedValue(null);

      const result = await dealRepository.createDealRevision(
        "missing",
        "t1",
        { name: "X" },
        "u1",
        null,
      );

      expect(result).toBeNull();
      expect(txDealUpdate).not.toHaveBeenCalled();
      expect(txDealCreate).not.toHaveBeenCalled();
    });
  });

  describe("createDeleteRevision", () => {
    it("marks parent isLatest false and creates deleted revision with same data", async () => {
      const parent = {
        id: "parent-1",
        tenantId: "t1",
        name: "Deal",
        value: 100,
        stage: "Lead",
        probability: 50,
        status: "OPEN" as const,
        pipelineId: "p1",
        assignedToId: "u1",
        createdById: "u1",
        revisionNo: 1,
        lineItems: [],
      };
      const deletedRevision = {
        id: "del-1",
        isLatest: true,
        deletedAt: new Date(),
      };
      txDealFindFirst.mockResolvedValue(parent);
      txDealUpdate.mockResolvedValue(undefined);
      txDealCreate.mockResolvedValue(deletedRevision);

      const result = await dealRepository.createDeleteRevision(
        "parent-1",
        "t1",
        {
          deletedBy: "u1",
          deleteReason: "Duplicate",
        },
      );

      expect(mockTransaction).toHaveBeenCalled();
      expect(txDealUpdate).toHaveBeenCalledWith({
        where: { id: "parent-1" },
        data: { isLatest: false },
      });
      expect(txDealCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "t1",
            name: "Deal",
            parentDealId: "parent-1",
            revisionNo: 2,
            isLatest: true,
            deletedBy: "u1",
            deleteReason: "Duplicate",
          }),
        }),
      );
      expect(result).toEqual(deletedRevision);
    });

    it("returns null when parent deal not found", async () => {
      txDealFindFirst.mockResolvedValue(null);

      const result = await dealRepository.createDeleteRevision(
        "missing",
        "t1",
        {
          deletedBy: "u1",
          deleteReason: null,
        },
      );

      expect(result).toBeNull();
      expect(txDealUpdate).not.toHaveBeenCalled();
      expect(txDealCreate).not.toHaveBeenCalled();
    });
  });
});
