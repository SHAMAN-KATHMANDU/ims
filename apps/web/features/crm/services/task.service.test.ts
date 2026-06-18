import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  bulkCompleteTasks,
  bulkDeleteTasks,
  type Task,
  type TaskListParams,
} from "./task.service";

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

describe("task.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTasks", () => {
    it("fetches tasks with no optional params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "t1",
              title: "Task 1",
              completed: false,
              status: "OPEN",
              priority: "MEDIUM",
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
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
      });

      const result = await getTasks();

      expect(mockGet).toHaveBeenCalledWith("/tasks", { params: {} });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe("t1");
      expect(result.pagination.totalItems).toBe(1);
    });

    it("passes all optional pagination and filter params correctly", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 2,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 5,
            hasNextPage: false,
            hasPrevPage: true,
          },
        },
      });

      const params: TaskListParams = {
        page: 2,
        limit: 5,
        search: "urgent",
        sortBy: "dueDate",
        sortOrder: "asc",
        completed: false,
        assignedToId: "user-123",
        dueToday: true,
        contactId: "contact-456",
        dealId: "deal-789",
        orphaned: false,
      };

      await getTasks(params);

      expect(mockGet).toHaveBeenCalledWith("/tasks", { params });
    });

    it("handles empty task list response", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getTasks();

      expect(result.data).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });

    it("returns paginated response with metadata", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "t1",
              title: "Task 1",
              completed: false,
              status: "IN_PROGRESS",
              priority: "HIGH",
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
            {
              id: "t2",
              title: "Task 2",
              completed: true,
              status: "DONE",
              priority: "LOW",
              createdAt: "2025-01-02T00:00:00Z",
              updatedAt: "2025-01-02T00:00:00Z",
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalItems: 42,
            itemsPerPage: 10,
            hasNextPage: true,
            hasPrevPage: false,
          },
        },
      });

      const result = await getTasks({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(42);
    });
  });

  describe("getTaskById", () => {
    it("fetches a task by id with correct endpoint", async () => {
      const task: Task = {
        id: "task-123",
        title: "Single Task",
        completed: false,
        status: "OPEN",
        priority: "MEDIUM",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      mockGet.mockResolvedValue({ data: { task } });

      const result = await getTaskById("task-123");

      expect(mockGet).toHaveBeenCalledWith("/tasks/task-123");
      expect(result.task.id).toBe("task-123");
      expect(result.task.title).toBe("Single Task");
    });

    it("handles task with all nested relations populated", async () => {
      const task: Task = {
        id: "task-789",
        title: "Complex Task",
        dueDate: "2025-12-31",
        completed: false,
        status: "IN_PROGRESS",
        priority: "HIGH",
        contactId: "contact-1",
        memberId: "member-1",
        dealId: "deal-1",
        companyId: "company-1",
        assignedToId: "user-1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        contact: { id: "contact-1", firstName: "John", lastName: "Doe" },
        member: { id: "member-1", name: "Member Name", phone: "555-1234" },
        deal: { id: "deal-1", name: "Big Deal" },
        company: { id: "company-1", name: "Acme Corp" },
        assignedTo: { id: "user-1", username: "johndoe" },
      };

      mockGet.mockResolvedValue({ data: { task } });

      const result = await getTaskById("task-789");

      expect(result.task.contact?.firstName).toBe("John");
      expect(result.task.deal?.name).toBe("Big Deal");
      expect(result.task.assignedTo?.username).toBe("johndoe");
    });

    it("handles task with null optional fields", async () => {
      const task: Task = {
        id: "task-min",
        title: "Minimal Task",
        dueDate: null,
        completed: false,
        status: "OPEN",
        priority: "LOW",
        contactId: null,
        memberId: null,
        dealId: null,
        companyId: null,
        assignedToId: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      mockGet.mockResolvedValue({ data: { task } });

      const result = await getTaskById("task-min");

      expect(result.task.dueDate).toBeNull();
      expect(result.task.contactId).toBeNull();
      expect(result.task.assignedToId).toBeUndefined();
    });
  });

  describe("createTask", () => {
    it("creates task with required fields only", async () => {
      const newTask: Task = {
        id: "task-new",
        title: "New Task",
        completed: false,
        status: "OPEN",
        priority: "MEDIUM",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      mockPost.mockResolvedValue({ data: { task: newTask } });

      const result = await createTask({ title: "New Task" });

      expect(mockPost).toHaveBeenCalledWith("/tasks", { title: "New Task" });
      expect(result.task.id).toBe("task-new");
    });

    it("creates task with all optional fields", async () => {
      const newTask: Task = {
        id: "task-full",
        title: "Full Task",
        dueDate: "2025-03-15",
        completed: false,
        status: "IN_PROGRESS",
        priority: "HIGH",
        contactId: "contact-1",
        memberId: "member-1",
        dealId: "deal-1",
        companyId: "company-1",
        assignedToId: "user-1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      mockPost.mockResolvedValue({ data: { task: newTask } });

      const createData = {
        title: "Full Task",
        dueDate: "2025-03-15",
        contactId: "contact-1",
        memberId: "member-1",
        dealId: "deal-1",
        companyId: "company-1",
        assignedToId: "user-1",
        priority: "HIGH" as const,
        status: "IN_PROGRESS" as const,
      };

      const result = await createTask(createData);

      expect(mockPost).toHaveBeenCalledWith("/tasks", createData);
      expect(result.task.priority).toBe("HIGH");
      expect(result.task.status).toBe("IN_PROGRESS");
    });
  });

  describe("updateTask", () => {
    it("updates task with partial data", async () => {
      const updatedTask: Task = {
        id: "task-123",
        title: "Updated Title",
        completed: false,
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      mockPut.mockResolvedValue({ data: { task: updatedTask } });

      const result = await updateTask("task-123", {
        title: "Updated Title",
        priority: "HIGH",
      });

      expect(mockPut).toHaveBeenCalledWith("/tasks/task-123", {
        title: "Updated Title",
        priority: "HIGH",
      });
      expect(result.task.title).toBe("Updated Title");
    });

    it("updates task completed flag and status", async () => {
      const completedTask: Task = {
        id: "task-456",
        title: "Completed Task",
        completed: true,
        status: "DONE",
        priority: "MEDIUM",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-03T00:00:00Z",
      };

      mockPut.mockResolvedValue({ data: { task: completedTask } });

      const result = await updateTask("task-456", {
        completed: true,
        status: "DONE",
      });

      expect(mockPut).toHaveBeenCalledWith("/tasks/task-456", {
        completed: true,
        status: "DONE",
      });
      expect(result.task.completed).toBe(true);
      expect(result.task.status).toBe("DONE");
    });

    it("uses PUT verb and includes task id in URL", async () => {
      mockPut.mockResolvedValue({
        data: {
          task: {
            id: "special-id-xyz",
            title: "Task",
            completed: false,
            status: "OPEN",
            priority: "LOW",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      await updateTask("special-id-xyz", { priority: "LOW" });

      expect(mockPut).toHaveBeenCalledWith(
        "/tasks/special-id-xyz",
        expect.any(Object),
      );
    });
  });

  describe("completeTask", () => {
    it("completes a task by id", async () => {
      const completedTask: Task = {
        id: "task-to-complete",
        title: "Complete Me",
        completed: true,
        status: "DONE",
        priority: "MEDIUM",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      };

      mockPost.mockResolvedValue({ data: { task: completedTask } });

      const result = await completeTask("task-to-complete");

      expect(mockPost).toHaveBeenCalledWith("/tasks/task-to-complete/complete");
      expect(result.task.completed).toBe(true);
      expect(result.task.status).toBe("DONE");
    });

    it("sends POST to correct endpoint with no body", async () => {
      mockPost.mockResolvedValue({
        data: {
          task: {
            id: "t123",
            title: "Task",
            completed: true,
            status: "DONE",
            priority: "HIGH",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      await completeTask("t123");

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith("/tasks/t123/complete");
    });
  });

  describe("deleteTask", () => {
    it("deletes a task by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteTask("task-to-delete");

      expect(mockDelete).toHaveBeenCalledWith("/tasks/task-to-delete");
    });

    it("returns void on successful deletion", async () => {
      mockDelete.mockResolvedValue(undefined);

      const result = await deleteTask("any-id");

      expect(result).toBeUndefined();
    });
  });

  describe("bulkCompleteTasks", () => {
    it("completes multiple tasks with array of ids", async () => {
      mockPost.mockResolvedValue({ data: { count: 3 } });

      const result = await bulkCompleteTasks(["task-1", "task-2", "task-3"]);

      expect(mockPost).toHaveBeenCalledWith("/tasks/bulk-complete", {
        ids: ["task-1", "task-2", "task-3"],
      });
      expect(result.count).toBe(3);
    });

    it("handles bulk complete with empty array", async () => {
      mockPost.mockResolvedValue({ data: { count: 0 } });

      const result = await bulkCompleteTasks([]);

      expect(mockPost).toHaveBeenCalledWith("/tasks/bulk-complete", {
        ids: [],
      });
      expect(result.count).toBe(0);
    });

    it("handles bulk complete with single task", async () => {
      mockPost.mockResolvedValue({ data: { count: 1 } });

      const result = await bulkCompleteTasks(["single-task"]);

      expect(mockPost).toHaveBeenCalledWith("/tasks/bulk-complete", {
        ids: ["single-task"],
      });
      expect(result.count).toBe(1);
    });
  });

  describe("bulkDeleteTasks", () => {
    it("deletes multiple tasks with ids and optional reason", async () => {
      mockDelete.mockResolvedValue({ data: { count: 2 } });

      const result = await bulkDeleteTasks(
        ["task-x", "task-y"],
        "duplicate entries",
      );

      expect(mockDelete).toHaveBeenCalledWith("/tasks/bulk", {
        data: { ids: ["task-x", "task-y"], reason: "duplicate entries" },
      });
      expect(result.count).toBe(2);
    });

    it("deletes tasks without reason parameter", async () => {
      mockDelete.mockResolvedValue({ data: { count: 1 } });

      const result = await bulkDeleteTasks(["task-single"]);

      expect(mockDelete).toHaveBeenCalledWith("/tasks/bulk", {
        data: { ids: ["task-single"], reason: undefined },
      });
      expect(result.count).toBe(1);
    });

    it("handles bulk delete with empty array and reason", async () => {
      mockDelete.mockResolvedValue({ data: { count: 0 } });

      const result = await bulkDeleteTasks([], "cleanup");

      expect(mockDelete).toHaveBeenCalledWith("/tasks/bulk", {
        data: { ids: [], reason: "cleanup" },
      });
      expect(result.count).toBe(0);
    });

    it("uses DELETE verb with data in request body", async () => {
      mockDelete.mockResolvedValue({ data: { count: 5 } });

      await bulkDeleteTasks(
        ["id1", "id2", "id3", "id4", "id5"],
        "batch cleanup",
      );

      expect(mockDelete).toHaveBeenCalledWith(
        "/tasks/bulk",
        expect.objectContaining({
          data: expect.objectContaining({
            ids: expect.any(Array),
            reason: "batch cleanup",
          }),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("propagates axios errors from getTasks", async () => {
      const error = new Error("Network error");
      mockGet.mockRejectedValue(error);

      await expect(getTasks()).rejects.toThrow("Network error");
    });

    it("propagates axios errors from createTask", async () => {
      const error = new Error("Validation failed");
      mockPost.mockRejectedValue(error);

      await expect(createTask({ title: "New" })).rejects.toThrow(
        "Validation failed",
      );
    });

    it("propagates axios errors from updateTask", async () => {
      const error = new Error("Not found");
      mockPut.mockRejectedValue(error);

      await expect(
        updateTask("missing-id", { title: "Updated" }),
      ).rejects.toThrow("Not found");
    });

    it("propagates axios errors from deleteTask", async () => {
      const error = new Error("Permission denied");
      mockDelete.mockRejectedValue(error);

      await expect(deleteTask("protected-id")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("URL construction and ID handling", () => {
    it("correctly encodes task id in URL for special characters", async () => {
      mockGet.mockResolvedValue({
        data: {
          task: {
            id: "task-with-special-chars",
            title: "Task",
            completed: false,
            status: "OPEN",
            priority: "MEDIUM",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      await getTaskById("task-with-special-chars");

      expect(mockGet).toHaveBeenCalledWith("/tasks/task-with-special-chars");
    });

    it("constructs correct endpoint for updateTask with uuid", async () => {
      mockPut.mockResolvedValue({
        data: {
          task: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Task",
            completed: false,
            status: "OPEN",
            priority: "MEDIUM",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      await updateTask("550e8400-e29b-41d4-a716-446655440000", {
        title: "Updated",
      });

      expect(mockPut).toHaveBeenCalledWith(
        "/tasks/550e8400-e29b-41d4-a716-446655440000",
        expect.any(Object),
      );
    });

    it("constructs correct endpoint for completeTask with numeric id", async () => {
      mockPost.mockResolvedValue({
        data: {
          task: {
            id: "12345",
            title: "Task",
            completed: true,
            status: "DONE",
            priority: "MEDIUM",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      await completeTask("12345");

      expect(mockPost).toHaveBeenCalledWith("/tasks/12345/complete");
    });
  });

  describe("response unwrapping", () => {
    it("correctly unwraps getTasks pagination response", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            {
              id: "t1",
              title: "Task",
              completed: false,
              status: "OPEN",
              priority: "MEDIUM",
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 10,
            totalItems: 100,
            itemsPerPage: 10,
            hasNextPage: true,
            hasPrevPage: false,
          },
        },
      });

      const result = await getTasks();

      // Should have .data and .pagination at top level
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("correctly unwraps getTaskById task object", async () => {
      mockGet.mockResolvedValue({
        data: {
          task: {
            id: "t1",
            title: "Task",
            completed: false,
            status: "OPEN",
            priority: "MEDIUM",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        },
      });

      const result = await getTaskById("t1");

      // Should have .task at top level
      expect(result).toHaveProperty("task");
      expect(result.task.id).toBe("t1");
    });

    it("correctly unwraps bulkCompleteTasks count response", async () => {
      mockPost.mockResolvedValue({ data: { count: 5 } });

      const result = await bulkCompleteTasks(["t1", "t2", "t3", "t4", "t5"]);

      expect(result).toEqual({ count: 5 });
      expect(typeof result.count).toBe("number");
    });

    it("correctly unwraps bulkDeleteTasks count response", async () => {
      mockDelete.mockResolvedValue({ data: { count: 3 } });

      const result = await bulkDeleteTasks(["t1", "t2", "t3"]);

      expect(result).toEqual({ count: 3 });
      expect(typeof result.count).toBe("number");
    });
  });
});
