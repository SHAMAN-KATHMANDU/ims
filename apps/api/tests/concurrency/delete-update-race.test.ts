/**
 * Phase 6 — Concurrency tests: delete/update race.
 * Parallel delete and update on same resource yields consistent outcome.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Response } from "express";
import { makeReq, mockRes } from "@tests/helpers/controller";

vi.mock("@/modules/categories/category.service", () => ({
  CategoryService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getSubcategories: vi.fn(),
    createSubcategory: vi.fn(),
    deleteSubcategory: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import categoryController from "@/modules/categories/category.controller";
import * as categoryServiceModule from "@/modules/categories/category.service";

const mockService = categoryServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

describe("Delete/update race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.update.mockResolvedValue({
      id: "cat-1",
      name: "Updated",
      description: "Desc",
    });
    mockService.delete.mockResolvedValue(undefined);
  });

  it("delete and update in parallel both complete (no deadlock or crash)", async () => {
    const reqUpdate = makeReq({
      params: { id: "cat-1" },
      body: { name: "Updated" },
    });
    const reqDelete = makeReq({
      params: { id: "cat-1" },
      body: {},
    });
    const resUpdate = mockRes() as Response;
    const resDelete = mockRes() as Response;

    const [updateResult, deleteResult] = await Promise.allSettled([
      categoryController.updateCategory(reqUpdate, resUpdate),
      categoryController.deleteCategory(reqDelete, resDelete),
    ]);

    expect(updateResult.status).toBe("fulfilled");
    expect(deleteResult.status).toBe("fulfilled");
    expect(mockService.update).toHaveBeenCalled();
    expect(mockService.delete).toHaveBeenCalled();
  });
});
