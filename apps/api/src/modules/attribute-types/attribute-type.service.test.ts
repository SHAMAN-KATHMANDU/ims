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
const mockFindValueById = vi.fn();
const mockCountValueUsage = vi.fn();
const mockGetValueUsage = vi.fn();
const mockDeleteValue = vi.fn();
const mockReassignAndDeleteValue = vi.fn();

const mockRepo = {
  findByCode: mockFindByCode,
  findByCodeExcluding: mockFindByCodeExcluding,
  create: mockCreate,
  findMany: mockFindMany,
  findManyPaginated: mockFindManyPaginated,
  findFirst: mockFindFirst,
  update: mockUpdate,
  findValueById: mockFindValueById,
  countValueUsage: mockCountValueUsage,
  getValueUsage: mockGetValueUsage,
  deleteValue: mockDeleteValue,
  reassignAndDeleteValue: mockReassignAndDeleteValue,
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

  describe("deleteValue", () => {
    const type = { id: "at1", name: "Color" };
    const value = { id: "av1", value: "Red", attributeTypeId: "at1" };

    it("deletes directly when the value is not in use", async () => {
      mockFindFirst.mockResolvedValue(type);
      mockFindValueById.mockResolvedValue(value);
      mockCountValueUsage.mockResolvedValue(0);

      await attributeTypeService.deleteValue("at1", "av1", "t1");

      expect(mockDeleteValue).toHaveBeenCalledWith("av1");
      expect(mockReassignAndDeleteValue).not.toHaveBeenCalled();
    });

    it("throws 409 VALUE_IN_USE when in use and no reassignment target given", async () => {
      mockFindFirst.mockResolvedValue(type);
      mockFindValueById.mockResolvedValue(value);
      mockCountValueUsage.mockResolvedValue(3);

      await expect(
        attributeTypeService.deleteValue("at1", "av1", "t1"),
      ).rejects.toMatchObject({ statusCode: 409, code: "VALUE_IN_USE" });

      expect(mockDeleteValue).not.toHaveBeenCalled();
      expect(mockReassignAndDeleteValue).not.toHaveBeenCalled();
    });

    it("reassigns then deletes when a valid target is supplied", async () => {
      mockFindFirst.mockResolvedValue(type);
      mockFindValueById
        .mockResolvedValueOnce(value) // the value being deleted
        .mockResolvedValueOnce({ id: "av2", value: "Blue" }); // reassign target
      mockCountValueUsage.mockResolvedValue(3);

      await attributeTypeService.deleteValue("at1", "av1", "t1", "av2");

      expect(mockReassignAndDeleteValue).toHaveBeenCalledWith("av1", "av2");
      expect(mockDeleteValue).not.toHaveBeenCalled();
    });

    it("throws 400 when reassigning a value to itself", async () => {
      mockFindFirst.mockResolvedValue(type);
      mockFindValueById.mockResolvedValue(value);
      mockCountValueUsage.mockResolvedValue(3);

      await expect(
        attributeTypeService.deleteValue("at1", "av1", "t1", "av1"),
      ).rejects.toMatchObject(
        createError("Cannot reassign a value to itself", 400),
      );

      expect(mockReassignAndDeleteValue).not.toHaveBeenCalled();
    });

    it("throws 404 when the reassignment target does not exist", async () => {
      mockFindFirst.mockResolvedValue(type);
      mockFindValueById
        .mockResolvedValueOnce(value)
        .mockResolvedValueOnce(null); // target not found
      mockCountValueUsage.mockResolvedValue(3);

      await expect(
        attributeTypeService.deleteValue("at1", "av1", "t1", "missing"),
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mockReassignAndDeleteValue).not.toHaveBeenCalled();
    });
  });

  describe("getValueUsage", () => {
    it("returns usage counts for an existing value", async () => {
      mockFindFirst.mockResolvedValue({ id: "at1", name: "Color" });
      mockFindValueById.mockResolvedValue({ id: "av1", value: "Red" });
      mockGetValueUsage.mockResolvedValue({
        variationCount: 4,
        productCount: 2,
      });

      const result = await attributeTypeService.getValueUsage(
        "at1",
        "av1",
        "t1",
      );

      expect(result).toEqual({ variationCount: 4, productCount: 2 });
    });

    it("throws 404 when the value is not found", async () => {
      mockFindFirst.mockResolvedValue({ id: "at1", name: "Color" });
      mockFindValueById.mockResolvedValue(null);

      await expect(
        attributeTypeService.getValueUsage("at1", "missing", "t1"),
      ).rejects.toMatchObject(createError("Attribute value not found", 404));
    });
  });
});
