import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttributeTypeService } from "./attribute-type.service";
import type { AttributeTypeRepository } from "./attribute-type.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindByCode = vi.fn();
const mockFindByCodeExcluding = vi.fn();
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockFindManyPaginated = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

const mockRepo = {
  findByCode: mockFindByCode,
  findByCodeExcluding: mockFindByCodeExcluding,
  create: mockCreate,
  findMany: mockFindMany,
  findManyPaginated: mockFindManyPaginated,
  findFirst: mockFindFirst,
  update: mockUpdate,
} as unknown as AttributeTypeRepository;

const attributeTypeService = new AttributeTypeService(mockRepo);

describe("AttributeTypeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates attribute type when code is available", async () => {
      mockFindByCode.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "at1",
        name: "Color",
        code: "color",
        tenantId: "t1",
      });

      const result = await attributeTypeService.create("t1", {
        name: "Color",
      });

      expect(result.code).toBe("color");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Color", code: "color" }),
      );
    });

    it("throws 409 when code already exists", async () => {
      mockFindByCode.mockResolvedValue({ id: "at0", code: "color" });

      await expect(
        attributeTypeService.create("t1", { name: "Color" }),
      ).rejects.toMatchObject(
        createError("An attribute type with this code already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("throws 400 when name/code is empty", async () => {
      mockFindByCode.mockResolvedValue(null);

      await expect(
        attributeTypeService.create("t1", { name: "   " }),
      ).rejects.toMatchObject(
        createError(
          "Code is required (derived from name if not provided)",
          400,
        ),
      );
    });
  });

  describe("getById", () => {
    it("returns attribute type when found", async () => {
      const at = { id: "at1", name: "Color", code: "color" };
      mockFindFirst.mockResolvedValue(at);

      const result = await attributeTypeService.getById("at1", "t1");
      expect(result).toEqual(at);
    });

    it("throws 404 when not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(
        attributeTypeService.getById("missing", "t1"),
      ).rejects.toMatchObject(createError("Attribute type not found", 404));
    });
  });
});
