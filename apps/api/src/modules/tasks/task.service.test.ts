import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockComplete = vi.fn();
const mockSoftDelete = vi.fn();
const mockCreateNotification = vi.fn();

vi.mock("./task.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    complete: (...args: unknown[]) => mockComplete(...args),
    softDelete: (...args: unknown[]) => mockSoftDelete(...args),
    createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  },
}));

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import taskService from "./task.service";

describe("TaskService", () => {
  const tenantId = "t1";
  const userId = "u1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates task and does not create notification when no dueDate or assignedToId", async () => {
      const created = { id: "t1", title: "Call client" };
      mockCreate.mockResolvedValue(created);

      const result = await taskService.create(
        tenantId,
        { title: "Call client" },
        userId,
      );

      expect(result).toEqual(created);
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("creates notification when dueDate and assignedToId present", async () => {
      const dueDate = new Date("2024-06-15");
      const created = {
        id: "t1",
        title: "Follow up",
        dueDate,
        assignedToId: "u2",
      };
      mockCreate.mockResolvedValue(created);

      const result = await taskService.create(
        tenantId,
        {
          title: "Follow up",
          dueDate: dueDate.toISOString(),
          assignedToId: "u2",
        },
        userId,
      );

      expect(result).toEqual(created);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        "u2",
        "t1",
        "Follow up",
        dueDate,
      );
    });
  });

  describe("getAll", () => {
    it("returns paginated tasks", async () => {
      const data = { tasks: [], pagination: {} };
      mockFindAll.mockResolvedValue(data);

      const result = await taskService.getAll(tenantId, { page: 1 });

      expect(result).toEqual(data);
    });
  });

  describe("getById", () => {
    it("returns task when found", async () => {
      const task = { id: "t1", title: "Call" };
      mockFindById.mockResolvedValue(task);

      const result = await taskService.getById(tenantId, "t1");

      expect(result).toEqual(task);
    });

    it("throws 404 when task not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        taskService.getById(tenantId, "missing"),
      ).rejects.toMatchObject({ statusCode: 404, message: "Task not found" });
    });
  });

  describe("update", () => {
    it("updates task when found", async () => {
      const existing = { id: "t1", title: "Old" };
      const updated = { id: "t1", title: "New" };
      mockFindById.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(updated);

      const result = await taskService.update(tenantId, "t1", { title: "New" });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalledWith("t1", { title: "New" }, existing);
    });

    it("throws 404 when task not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        taskService.update(tenantId, "missing", { title: "x" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Task not found" });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("complete", () => {
    it("completes task when found", async () => {
      const existing = { id: "t1" };
      const completed = { id: "t1", completed: true };
      mockFindById.mockResolvedValue(existing);
      mockComplete.mockResolvedValue(completed);

      const result = await taskService.complete(tenantId, "t1");

      expect(result).toEqual(completed);
      expect(mockComplete).toHaveBeenCalledWith("t1");
    });

    it("throws 404 when task not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        taskService.complete(tenantId, "missing"),
      ).rejects.toMatchObject({ statusCode: 404, message: "Task not found" });

      expect(mockComplete).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("soft-deletes task", async () => {
      mockFindById.mockResolvedValue({ id: "t1" });

      await taskService.delete(tenantId, "t1", { userId: "u1" });

      expect(mockSoftDelete).toHaveBeenCalledWith("t1", {
        deletedBy: "u1",
        deleteReason: null,
      });
    });

    it("throws 404 when task not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        taskService.delete(tenantId, "missing", { userId: "u1" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Task not found" });

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });
});
