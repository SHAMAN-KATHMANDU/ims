import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product.service";
import type { ProductRepository } from "./product.repository";
import { createError } from "@/middlewares/errorHandler";

const mockPublishDomainEvent = vi.fn().mockResolvedValue(undefined);
const mockFindProductById = vi.fn();
const mockFindProductForUpdate = vi.fn();
const mockSoftDeleteProduct = vi.fn();
const mockGetLowStockVariationIds = vi.fn();
const mockFindAllProductsByTotalStock = vi.fn();
const mockFindTags = vi.fn();
const mockFindTagsPaginated = vi.fn();
const mockCountTags = vi.fn();
const mockCreateTag = vi.fn();
const mockUpdateTag = vi.fn();
const mockDeleteTag = vi.fn();

const mockRepo = {
  findProductById: mockFindProductById,
  findProductForUpdate: mockFindProductForUpdate,
  softDeleteProduct: mockSoftDeleteProduct,
  getLowStockVariationIds: mockGetLowStockVariationIds,
  findAllProductsByTotalStock: mockFindAllProductsByTotalStock,
  findTags: mockFindTags,
  findTagsPaginated: mockFindTagsPaginated,
  countTags: mockCountTags,
  createTag: mockCreateTag,
  updateTag: mockUpdateTag,
  deleteTag: mockDeleteTag,
} as unknown as ProductRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));
vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
  },
}));

const productService = new ProductService(mockRepo);

describe("ProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("returns product when found", async () => {
      const product = {
        id: "p1",
        name: "Widget",
        imsCode: "W001",
        tenantId: "t1",
      };
      mockFindProductById.mockResolvedValue(product);

      const result = await productService.findById("p1");
      expect(result).toEqual(product);
    });

    it("throws 404 when product not found", async () => {
      mockFindProductById.mockResolvedValue(null);

      await expect(productService.findById("missing")).rejects.toMatchObject(
        createError("Product not found", 404),
      );
    });
  });

  describe("delete", () => {
    it("throws 404 when product not found", async () => {
      mockFindProductForUpdate.mockResolvedValue(null);

      await expect(
        productService.delete("missing", {
          userId: "u1",
          tenantId: "t1",
        }),
      ).rejects.toMatchObject(createError("Product not found", 404));

      expect(mockSoftDeleteProduct).not.toHaveBeenCalled();
    });

    it("publishes an automation event after delete", async () => {
      mockFindProductForUpdate.mockResolvedValue({
        id: "p1",
        name: "Widget",
        imsCode: "W001",
        categoryId: "c1",
        vendorId: "v1",
      });
      mockSoftDeleteProduct.mockResolvedValue(undefined);

      await productService.delete("p1", {
        userId: "u1",
        tenantId: "t1",
      });

      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "catalog.product.updated",
          entityId: "p1",
        }),
      );
    });
  });

  describe("findAll totalStock sorting", () => {
    it("uses totalStock repository path for ascending sort", async () => {
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-low" }, { id: "p-high" }],
        totalItems: 2,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalStock",
        sortOrder: "asc",
      });

      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant-1" }),
        "asc",
        0,
        10,
      );
      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });

    it("passes lowStock variation ids in totalStock path", async () => {
      mockGetLowStockVariationIds.mockResolvedValue(["var-1"]);
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-1" }],
        totalItems: 1,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalstock",
        sortOrder: "desc",
        lowStock: true,
      });

      expect(mockGetLowStockVariationIds).toHaveBeenCalled();
      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          lowStock: true,
          lowStockVariationIds: ["var-1"],
        }),
        "desc",
        0,
        10,
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe("findAll totalStock sorting", () => {
    it("uses totalStock repository path for ascending sort", async () => {
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-low" }, { id: "p-high" }],
        totalItems: 2,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalStock",
        sortOrder: "asc",
      });

      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant-1" }),
        "asc",
        0,
        10,
      );
      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });

    it("passes lowStock variation ids in totalStock path", async () => {
      mockGetLowStockVariationIds.mockResolvedValue(["var-1"]);
      mockFindAllProductsByTotalStock.mockResolvedValue({
        products: [{ id: "p-1" }],
        totalItems: 1,
      });

      const result = await productService.findAll("tenant-1", {
        page: 1,
        limit: 10,
        sortBy: "totalstock",
        sortOrder: "desc",
        lowStock: true,
      });

      expect(mockGetLowStockVariationIds).toHaveBeenCalled();
      expect(mockFindAllProductsByTotalStock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          lowStock: true,
          lowStockVariationIds: ["var-1"],
        }),
        "desc",
        0,
        10,
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe("getTags", () => {
    it("returns the unpaginated list when page/limit are absent", async () => {
      mockFindTags.mockResolvedValue([
        { id: "t1", name: "Sale", createdAt: new Date() },
      ]);
      const result = await productService.getTags("tenant-1");
      expect(mockFindTags).toHaveBeenCalledWith("tenant-1");
      expect(mockFindTagsPaginated).not.toHaveBeenCalled();
      expect(result.tags).toHaveLength(1);
      expect("pagination" in result).toBe(false);
    });

    it("returns paginated tags when page+limit are provided", async () => {
      mockFindTagsPaginated.mockResolvedValue([
        { id: "t1", name: "Sale", createdAt: new Date() },
        { id: "t2", name: "New", createdAt: new Date() },
      ]);
      mockCountTags.mockResolvedValue(2);
      const result = await productService.getTags("tenant-1", {
        page: 1,
        limit: 10,
        search: "sa",
      });
      expect(mockFindTagsPaginated).toHaveBeenCalledWith(
        "tenant-1",
        0,
        10,
        "sa",
      );
      expect(mockCountTags).toHaveBeenCalledWith("tenant-1", "sa");
      expect("pagination" in result).toBe(true);
    });
  });

  describe("createTag", () => {
    it("delegates to repo and surfaces { tag, created } shape", async () => {
      mockCreateTag.mockResolvedValue({
        tag: { id: "t1", name: "Sale" },
        created: true,
      });
      const result = await productService.createTag("tenant-1", "Sale");
      expect(mockCreateTag).toHaveBeenCalledWith("tenant-1", "Sale");
      expect(result.created).toBe(true);
    });
  });

  describe("updateTag", () => {
    it("returns the updated tag on success", async () => {
      mockUpdateTag.mockResolvedValue({ id: "t1", name: "Renamed" });
      const result = await productService.updateTag(
        "tenant-1",
        "t1",
        "Renamed",
      );
      expect(result.name).toBe("Renamed");
    });

    it("throws 404 when repo returns null", async () => {
      mockUpdateTag.mockResolvedValue(null);
      await expect(
        productService.updateTag("tenant-1", "missing", "Whatever"),
      ).rejects.toMatchObject(createError("Tag not found", 404));
    });
  });

  describe("deleteTag", () => {
    it("throws 404 when repo returns null", async () => {
      mockDeleteTag.mockResolvedValue(null);
      await expect(
        productService.deleteTag("tenant-1", "missing"),
      ).rejects.toMatchObject(createError("Tag not found", 404));
    });

    it("resolves silently on success", async () => {
      mockDeleteTag.mockResolvedValue({ id: "t1", name: "Sale" });
      await expect(
        productService.deleteTag("tenant-1", "t1"),
      ).resolves.toBeUndefined();
    });
  });

  // Companion guard to #561: an existing variation's photo list must be
  // honoured as the new full state when an array (including []) is provided.
  // Sending an empty array should clear all photos; sending `undefined`
  // should leave them alone.
  describe("update — variation photo replacement", () => {
    const baseCtx = { tenantId: "tenant-1", userId: "user-1" };

    const mockFindVariationsWithDependents = vi.fn();
    const mockDeleteVariationPhotos = vi.fn();
    const mockUpdateProductVariation = vi.fn();
    const mockUpdateProductRepo = vi.fn();
    const mockSetVariationAttributes = vi.fn();
    const mockFindDefaultWarehouse = vi.fn();
    const mockCountLocInvForSub = vi.fn();
    const mockCountSaleItemsForSub = vi.fn();
    const mockCountTransferItemsForSub = vi.fn();
    const mockDeleteSubVariation = vi.fn();
    const mockCreateSubVariation = vi.fn();
    const mockFindAllLocInvForVariation = vi.fn();

    const wireRepo = (repo: ProductRepository) => {
      Object.assign(repo, {
        findProductForUpdate: vi.fn().mockResolvedValue({
          id: "p1",
          tenantId: "tenant-1",
          name: "Rope Bracelet",
          imsCode: "RB-1",
          categoryId: "c1",
        }),
        findVariationsWithDependents: mockFindVariationsWithDependents,
        deleteVariationPhotos: mockDeleteVariationPhotos,
        updateProductVariation: mockUpdateProductVariation,
        updateProduct: mockUpdateProductRepo,
        setVariationAttributes: mockSetVariationAttributes,
        findDefaultWarehouse: mockFindDefaultWarehouse,
        countLocationInventoryForSubVariation: mockCountLocInvForSub,
        countSaleItemsForSubVariation: mockCountSaleItemsForSub,
        countTransferItemsForSubVariation: mockCountTransferItemsForSub,
        deleteProductSubVariation: mockDeleteSubVariation,
        createProductSubVariation: mockCreateSubVariation,
        findAllLocationInventoryForVariation: mockFindAllLocInvForVariation,
      });
    };

    beforeEach(() => {
      vi.clearAllMocks();
      wireRepo(mockRepo);
      mockFindVariationsWithDependents.mockResolvedValue([
        {
          id: "var-1",
          stockQuantity: 5,
          subVariations: [],
          _count: { saleItems: 0, transferItems: 0 },
        },
      ]);
      mockUpdateProductRepo.mockResolvedValue({
        id: "p1",
        name: "Rope Bracelet",
        imsCode: "RB-1",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        dateModified: new Date("2026-01-01T00:00:00Z"),
      });
      mockFindAllLocInvForVariation.mockResolvedValue([]);
    });

    it("clears existing photos when the client sends an empty photos array", async () => {
      await productService.update(
        "p1",
        {
          variations: [{ id: "var-1", stockQuantity: 5, photos: [] }],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      expect(mockDeleteVariationPhotos).toHaveBeenCalledWith("var-1");
      expect(mockUpdateProductVariation).toHaveBeenCalledWith(
        "var-1",
        expect.not.objectContaining({ photos: expect.anything() }),
      );
    });

    it("leaves photos alone when the photos field is omitted", async () => {
      await productService.update(
        "p1",
        {
          variations: [{ id: "var-1", stockQuantity: 5 }],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      expect(mockDeleteVariationPhotos).not.toHaveBeenCalled();
    });

    it("replaces photos when the client sends a new list", async () => {
      await productService.update(
        "p1",
        {
          variations: [
            {
              id: "var-1",
              stockQuantity: 5,
              photos: [
                { photoUrl: "https://example.com/a.jpg", isPrimary: true },
              ],
            },
          ],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      expect(mockDeleteVariationPhotos).toHaveBeenCalledWith("var-1");
      expect(mockUpdateProductVariation).toHaveBeenCalledWith(
        "var-1",
        expect.objectContaining({
          photos: {
            create: [
              { photoUrl: "https://example.com/a.jpg", isPrimary: true },
            ],
          },
        }),
      );
    });
  });

  // A product with variations but NO sub-variations (the common case) used to
  // 500 on create: the inventory upsert keyed on the (location, variation,
  // sub_variation) compound-unique and Prisma 5.22 rejects a null
  // sub_variation_id in a compound-unique `where` at runtime (issue #610,
  // root-caused/fixed by #609). These tests lock the create() flow onto the
  // null-safe raw-upsert path so the regression can't return.
  describe("create — inventory seeding (issue #610 / #609)", () => {
    const baseCtx = { tenantId: "tenant-1", userId: "user-1" };

    const mockFindCategory = vi.fn();
    const mockFindDefaultWarehouse = vi.fn();
    const mockCreateProduct = vi.fn();
    const mockUpsertIncrement = vi.fn();
    const mockUpsertSeed = vi.fn();
    const mockCreateAuditLog = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      Object.assign(mockRepo, {
        findCategoryByIdAndTenant: mockFindCategory,
        findDefaultWarehouse: mockFindDefaultWarehouse,
        createProduct: mockCreateProduct,
        upsertIncrementLocationInventory: mockUpsertIncrement,
        upsertSeedLocationInventory: mockUpsertSeed,
        createAuditLog: mockCreateAuditLog,
      });
      mockFindCategory.mockResolvedValue({ id: "c1", name: "Furniture" });
      mockFindDefaultWarehouse.mockResolvedValue({ id: "wh-1" });
      mockCreateAuditLog.mockResolvedValue(undefined);
    });

    const baseDto = {
      name: "Bookshelf",
      categoryId: "c1",
      costPrice: 100,
      mrp: 200,
      // Explicit imsCode → take the direct create path (no auto-generation),
      // keeping these tests focused on the inventory-seeding branch.
      imsCode: "BK-1",
    };

    it("seeds a no-sub-variation line via upsertIncrement with subVariationId null (no 500)", async () => {
      mockCreateProduct.mockResolvedValue({
        id: "p1",
        name: "Bookshelf",
        imsCode: "BK-1",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        variations: [{ id: "var-1", stockQuantity: 10, subVariations: [] }],
      });

      await expect(
        productService.create(
          {
            ...baseDto,
            variations: [{ stockQuantity: 10 }],
          } as unknown as Parameters<typeof productService.create>[0],
          baseCtx as Parameters<typeof productService.create>[1],
        ),
      ).resolves.toMatchObject({ id: "p1" });

      expect(mockUpsertIncrement).toHaveBeenCalledWith({
        locationId: "wh-1",
        variationId: "var-1",
        subVariationId: null,
        quantity: 10,
      });
      expect(mockUpsertSeed).not.toHaveBeenCalled();
    });

    it("seeds each sub-variation via upsertSeed (not the increment path)", async () => {
      mockCreateProduct.mockResolvedValue({
        id: "p2",
        name: "Bookshelf",
        imsCode: "BK-2",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        variations: [
          {
            id: "var-2",
            stockQuantity: 0,
            subVariations: [{ id: "sub-a" }, { id: "sub-b" }],
          },
        ],
      });

      await productService.create(
        {
          ...baseDto,
          variations: [{ stockQuantity: 0, subVariants: ["A", "B"] }],
        } as unknown as Parameters<typeof productService.create>[0],
        baseCtx as Parameters<typeof productService.create>[1],
      );

      expect(mockUpsertSeed).toHaveBeenCalledWith({
        locationId: "wh-1",
        variationId: "var-2",
        subVariationId: "sub-a",
      });
      expect(mockUpsertSeed).toHaveBeenCalledWith({
        locationId: "wh-1",
        variationId: "var-2",
        subVariationId: "sub-b",
      });
      expect(mockUpsertIncrement).not.toHaveBeenCalled();
    });
  });

  // Bad attribute UUIDs (stale picker, mismatched type/value, or hand-edited
  // payload) used to bubble out as Prisma P2025 FK failures → generic 500.
  // The pre-write validator must catch them as 400 errors.
  describe("update — variation attribute validation", () => {
    const baseCtx = { tenantId: "tenant-1", userId: "user-1" };

    const mockFindVariationsWithDependents = vi.fn();
    const mockUpdateProductVariation = vi.fn();
    const mockUpdateProductRepo = vi.fn();
    const mockSetVariationAttributes = vi.fn();
    const mockFindTypesByIdsAndTenant = vi.fn();
    const mockFindValuesByIdsAndTenant = vi.fn();
    const mockDeleteVariationPhotos = vi.fn();
    const mockFindAllLocInvForVariation = vi.fn();

    const wireRepo = (repo: ProductRepository) => {
      Object.assign(repo, {
        findProductForUpdate: vi.fn().mockResolvedValue({
          id: "p1",
          tenantId: "tenant-1",
          name: "Rope Bracelet",
          imsCode: "RB-1",
          categoryId: "c1",
        }),
        findVariationsWithDependents: mockFindVariationsWithDependents,
        deleteVariationPhotos: mockDeleteVariationPhotos,
        updateProductVariation: mockUpdateProductVariation,
        updateProduct: mockUpdateProductRepo,
        setVariationAttributes: mockSetVariationAttributes,
        findAttributeTypesByIdsAndTenant: mockFindTypesByIdsAndTenant,
        findAttributeValuesByIdsAndTenant: mockFindValuesByIdsAndTenant,
        findAllLocationInventoryForVariation: mockFindAllLocInvForVariation,
      });
    };

    beforeEach(() => {
      vi.clearAllMocks();
      wireRepo(mockRepo);
      mockFindVariationsWithDependents.mockResolvedValue([
        {
          id: "var-1",
          stockQuantity: 5,
          subVariations: [],
          _count: { saleItems: 0, transferItems: 0 },
        },
      ]);
      mockUpdateProductRepo.mockResolvedValue({
        id: "p1",
        name: "Rope Bracelet",
        imsCode: "RB-1",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        dateModified: new Date("2026-01-01T00:00:00Z"),
      });
      mockFindAllLocInvForVariation.mockResolvedValue([]);
    });

    const payload = (
      attrs: Array<{ attributeTypeId: string; attributeValueId: string }>,
    ) =>
      ({
        variations: [{ id: "var-1", stockQuantity: 5, attributes: attrs }],
      }) as Parameters<typeof productService.update>[1];

    it("rejects unknown attribute type id with 400", async () => {
      mockFindTypesByIdsAndTenant.mockResolvedValue([]);
      mockFindValuesByIdsAndTenant.mockResolvedValue([
        { id: "val-1", attributeTypeId: "type-1" },
      ]);

      await expect(
        productService.update(
          "p1",
          payload([{ attributeTypeId: "type-1", attributeValueId: "val-1" }]),
          baseCtx,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockSetVariationAttributes).not.toHaveBeenCalled();
    });

    it("rejects unknown attribute value id with 400", async () => {
      mockFindTypesByIdsAndTenant.mockResolvedValue([{ id: "type-1" }]);
      mockFindValuesByIdsAndTenant.mockResolvedValue([]);

      await expect(
        productService.update(
          "p1",
          payload([{ attributeTypeId: "type-1", attributeValueId: "val-X" }]),
          baseCtx,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockSetVariationAttributes).not.toHaveBeenCalled();
    });

    it("rejects a value belonging to a different type with 400", async () => {
      // val-1 actually belongs to type-OTHER, not the supplied type-1
      mockFindTypesByIdsAndTenant.mockResolvedValue([{ id: "type-1" }]);
      mockFindValuesByIdsAndTenant.mockResolvedValue([
        { id: "val-1", attributeTypeId: "type-OTHER" },
      ]);

      await expect(
        productService.update(
          "p1",
          payload([{ attributeTypeId: "type-1", attributeValueId: "val-1" }]),
          baseCtx,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockSetVariationAttributes).not.toHaveBeenCalled();
    });

    it("passes valid attribute ids through to setVariationAttributes", async () => {
      mockFindTypesByIdsAndTenant.mockResolvedValue([{ id: "type-1" }]);
      mockFindValuesByIdsAndTenant.mockResolvedValue([
        { id: "val-1", attributeTypeId: "type-1" },
      ]);

      await productService.update(
        "p1",
        payload([{ attributeTypeId: "type-1", attributeValueId: "val-1" }]),
        baseCtx,
      );

      expect(mockSetVariationAttributes).toHaveBeenCalledWith("var-1", [
        { attributeTypeId: "type-1", attributeValueId: "val-1" },
      ]);
    });

    // Regression for #599: a stale payload that still carries a deselected /
    // re-created attribute type must not persist that orphan row, otherwise it
    // leaks into the variant name as a historical/duplicate value.
    it("drops attributes whose type is not in the product's attributeTypeIds", async () => {
      Object.assign(mockRepo, {
        deleteProductAttributeTypes: vi.fn().mockResolvedValue(undefined),
        createProductAttributeTypes: vi.fn().mockResolvedValue(undefined),
      });
      // Both the current type and the orphaned old type pass UUID validation…
      mockFindTypesByIdsAndTenant.mockResolvedValue([
        { id: "type-1" },
        { id: "type-OLD" },
      ]);
      mockFindValuesByIdsAndTenant.mockResolvedValue([
        { id: "val-1", attributeTypeId: "type-1" },
        { id: "val-old", attributeTypeId: "type-OLD" },
      ]);

      await productService.update(
        "p1",
        {
          attributeTypeIds: ["type-1"],
          variations: [
            {
              id: "var-1",
              stockQuantity: 5,
              attributes: [
                { attributeTypeId: "type-OLD", attributeValueId: "val-old" },
                { attributeTypeId: "type-1", attributeValueId: "val-1" },
              ],
            },
          ],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      // …but only the selected type survives into the stored attributes.
      expect(mockSetVariationAttributes).toHaveBeenCalledWith("var-1", [
        { attributeTypeId: "type-1", attributeValueId: "val-1" },
      ]);
    });
  });

  // Regression: ProductVariation.stockQuantity is a denormalized aggregate of
  // sum(LocationInventory.quantity) for the variation. The variation form is
  // per-location, so its stockQuantity value reflects ONE location. If the API
  // wrote that single-location number into the cached aggregate when no
  // locationId was supplied, the cache would drift away from reality and the
  // outside table (computed from LocationInventory) would disagree with the
  // form. See plan: investigate-the-matter-lazy-ritchie.
  describe("update — stockQuantity drift guard", () => {
    const baseCtx = { tenantId: "tenant-1", userId: "user-1" };

    const mockFindVariationsWithDependents = vi.fn();
    const mockUpdateProductVariation = vi.fn();
    const mockUpdateProductRepo = vi.fn();
    const mockSetVariationAttributes = vi.fn();
    const mockFindAllLocInvForVariation = vi.fn();
    const mockUpsertSetLocInv = vi.fn();

    const wireRepo = (repo: ProductRepository) => {
      Object.assign(repo, {
        findProductForUpdate: vi.fn().mockResolvedValue({
          id: "p1",
          tenantId: "tenant-1",
          name: "Rope Bracelet",
          imsCode: "RB-1",
          categoryId: "c1",
        }),
        findVariationsWithDependents: mockFindVariationsWithDependents,
        updateProductVariation: mockUpdateProductVariation,
        updateProduct: mockUpdateProductRepo,
        setVariationAttributes: mockSetVariationAttributes,
        findAllLocationInventoryForVariation: mockFindAllLocInvForVariation,
        upsertSetLocationInventory: mockUpsertSetLocInv,
      });
    };

    beforeEach(() => {
      vi.clearAllMocks();
      wireRepo(mockRepo);
      mockFindVariationsWithDependents.mockResolvedValue([
        {
          id: "var-1",
          stockQuantity: 24,
          subVariations: [],
          _count: { saleItems: 0, transferItems: 0 },
        },
      ]);
      mockUpdateProductRepo.mockResolvedValue({
        id: "p1",
        name: "Rope Bracelet",
        imsCode: "RB-1",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        dateModified: new Date("2026-01-01T00:00:00Z"),
      });
    });

    it("recomputes stockQuantity from LocationInventory when payload omits locationId", async () => {
      // Real per-location rows total 24; the form sent 17 (one location's view).
      mockFindAllLocInvForVariation.mockResolvedValue([
        { quantity: 17 },
        { quantity: 7 },
      ]);

      await productService.update(
        "p1",
        {
          variations: [{ id: "var-1", stockQuantity: 17 }],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      expect(mockFindAllLocInvForVariation).toHaveBeenCalledWith("var-1");
      expect(mockUpdateProductVariation).toHaveBeenCalledWith(
        "var-1",
        expect.objectContaining({ stockQuantity: 24 }),
      );
      // Crucially, the form's 17 must NOT have leaked through.
      expect(mockUpdateProductVariation).not.toHaveBeenCalledWith(
        "var-1",
        expect.objectContaining({ stockQuantity: 17 }),
      );
    });

    it("still honours the locationId path: write LocationInventory then recompute aggregate", async () => {
      mockFindAllLocInvForVariation.mockResolvedValue([
        { quantity: 9 },
        { quantity: 7 },
      ]);

      await productService.update(
        "p1",
        {
          variations: [{ id: "var-1", stockQuantity: 9, locationId: "loc-1" }],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      // Atomic upsert (set) replaces the old find + set/create pair.
      expect(mockUpsertSetLocInv).toHaveBeenCalledWith({
        locationId: "loc-1",
        variationId: "var-1",
        subVariationId: null,
        quantity: 9,
      });
      expect(mockUpdateProductVariation).toHaveBeenCalledWith(
        "var-1",
        expect.objectContaining({ stockQuantity: 16 }),
      );
    });
  });

  // Regression (issue #574): a variation that HAS sub-variations tracks stock
  // per (sub-variation, location). The per-location edit form still posts a
  // single variation-level stockQuantity/locationId (the display aggregate of
  // one row). The old code wrote that into a subVariationId=null LocationInventory
  // row — a phantom that the aggregate recompute then double-counted (e.g.
  // 24 → 29). For sub-variation variations we must NOT write the null-sub row
  // and must drop any phantom rows left by prior edits.
  describe("update — sub-variation stock must not create a null-sub row", () => {
    const baseCtx = { tenantId: "tenant-1", userId: "user-1" };

    const mockFindVariationsWithDependents = vi.fn();
    const mockUpdateProductVariation = vi.fn();
    const mockUpdateProductRepo = vi.fn();
    const mockFindAllLocInvForVariation = vi.fn();
    const mockUpsertSetLocInv = vi.fn();
    const mockUpsertIncrementLocInv = vi.fn();
    const mockDeleteNullSubInv = vi.fn();

    const wireRepo = (repo: ProductRepository) => {
      Object.assign(repo, {
        findProductForUpdate: vi.fn().mockResolvedValue({
          id: "p1",
          tenantId: "tenant-1",
          name: "Bracelet 3 Gems",
          imsCode: "B3G-1",
          categoryId: "c1",
        }),
        findVariationsWithDependents: mockFindVariationsWithDependents,
        updateProductVariation: mockUpdateProductVariation,
        updateProduct: mockUpdateProductRepo,
        findAllLocationInventoryForVariation: mockFindAllLocInvForVariation,
        upsertSetLocationInventory: mockUpsertSetLocInv,
        upsertIncrementLocationInventory: mockUpsertIncrementLocInv,
        deleteNullSubVariationInventory: mockDeleteNullSubInv,
      });
    };

    beforeEach(() => {
      vi.clearAllMocks();
      wireRepo(mockRepo);
      // Variation already carries three sub-variations (Gem A/B/C).
      mockFindVariationsWithDependents.mockResolvedValue([
        {
          id: "var-1",
          stockQuantity: 24,
          subVariations: [
            { id: "s-a", name: "Gem A" },
            { id: "s-b", name: "Gem B" },
            { id: "s-c", name: "Gem C" },
          ],
          _count: { saleItems: 0, transferItems: 0 },
        },
      ]);
      // Real per-sub rows total 24 (5+3 per gem across two locations).
      mockFindAllLocInvForVariation.mockResolvedValue([
        { quantity: 5 },
        { quantity: 3 },
        { quantity: 5 },
        { quantity: 3 },
        { quantity: 5 },
        { quantity: 3 },
      ]);
      mockUpdateProductRepo.mockResolvedValue({
        id: "p1",
        name: "Bracelet 3 Gems",
        imsCode: "B3G-1",
        categoryId: "c1",
        vendorId: null,
        costPrice: 100,
        mrp: 200,
        dateModified: new Date("2026-01-01T00:00:00Z"),
      });
    });

    it("never writes a null-sub LocationInventory row and self-heals phantom rows", async () => {
      await productService.update(
        "p1",
        {
          variations: [
            {
              id: "var-1",
              // Display aggregate of one (gem, location) row; the form also
              // posts a locationId. Both must be ignored for stock writes.
              stockQuantity: 5,
              locationId: "loc-1",
              subVariants: ["Gem A", "Gem B", "Gem C"],
            },
          ],
        } as Parameters<typeof productService.update>[1],
        baseCtx,
      );

      // The phantom variation-level write must never happen.
      expect(mockUpsertSetLocInv).not.toHaveBeenCalled();
      expect(mockUpsertIncrementLocInv).not.toHaveBeenCalled();
      // Any pre-existing phantom null-sub row is cleaned up.
      expect(mockDeleteNullSubInv).toHaveBeenCalledWith("var-1");
      // Aggregate stays the true sum of per-sub rows (24), not 24 + 5.
      expect(mockUpdateProductVariation).toHaveBeenCalledWith(
        "var-1",
        expect.objectContaining({ stockQuantity: 24 }),
      );
    });
  });
});
