import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetTasks = vi.fn();
const mockGetTaskById = vi.fn();
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockCompleteTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockBulkCompleteTasks = vi.fn();
const mockBulkDeleteTasks = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/task.service", () => ({
  getTasks: (...args: unknown[]) => mockGetTasks(...args),
  getTaskById: (...args: unknown[]) => mockGetTaskById(...args),
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  completeTask: (...args: unknown[]) => mockCompleteTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  bulkCompleteTasks: (...args: unknown[]) => mockBulkCompleteTasks(...args),
  bulkDeleteTasks: (...args: unknown[]) => mockBulkDeleteTasks(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
  },
}));

vi.mock("./use-contacts", () => ({
  contactKeys: {
    detail: (id: string) => ["contacts", "detail", id] as const,
  },
}));

vi.mock("./use-deals", () => ({
  dealKeys: {
    lists: () => ["deals", "list"] as const,
    detail: (id: string) => ["deals", "detail", id] as const,
  },
}));

vi.mock("./use-workflows", () => ({
  workflowKeys: {
    all: ["workflows"] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useTasksPaginated,
  useTask,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useDeleteTask,
  useBulkCompleteTasks,
  useBulkDeleteTasks,
} from "./use-tasks";

describe("useTasksPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetTasks.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch tasks with default pagination params when no params provided", async () => {
    const { result } = renderHook(() => useTasksPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetTasks).toHaveBeenCalledWith({});
  });

  it("should NOT fetch when SALES_PIPELINE feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useTasksPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTasks).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useTasksPaginated({}, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTasks).not.toHaveBeenCalled();
  });

  it("should pass all pagination and filter params correctly to getTasks", async () => {
    const params = {
      page: 3,
      limit: 50,
      search: "urgent",
      sortBy: "dueDate",
      sortOrder: "asc" as const,
      completed: false,
      assignedToId: "user-123",
      dueToday: true,
      contactId: "contact-456",
      dealId: "deal-789",
      orphaned: false,
    };

    mockGetTasks.mockResolvedValue({
      data: [
        {
          id: "task1",
          title: "Urgent task",
          priority: "HIGH",
          completed: false,
        },
      ],
      pagination: { page: 3, limit: 50, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useTasksPaginated(params), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetTasks).toHaveBeenCalledWith(params);
  });

  it("should apply default values for missing pagination params", async () => {
    const partialParams = { search: "follow up" };

    mockGetTasks.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useTasksPaginated(partialParams), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetTasks).toHaveBeenCalledWith(partialParams);
  });
});

describe("useTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetTaskById.mockResolvedValue({
      task: {
        id: "task1",
        title: "Call client",
        priority: "MEDIUM",
        completed: false,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch task details when valid id is provided", async () => {
    const { result } = renderHook(() => useTask("task1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetTaskById).toHaveBeenCalledWith("task1");
  });

  it("should NOT fetch when id is empty string", async () => {
    const { result } = renderHook(() => useTask(""), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTaskById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useTask("task1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTaskById).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch even with valid id", async () => {
    const { result } = renderHook(() => useTask("task1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTaskById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when id is provided but feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useTask("task1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetTaskById).not.toHaveBeenCalled();
  });
});

describe("useCreateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateTask.mockResolvedValue({
      task: { id: "task1", title: "New task", priority: "MEDIUM" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createTask service with correct data shape", async () => {
    const createData = {
      title: "Call prospect",
      priority: "HIGH" as const,
      assignedToId: "user1",
    };

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateTask).toHaveBeenCalledWith(createData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    const createData = {
      title: "Follow up",
      priority: "MEDIUM" as const,
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle mutation with minimal required fields", async () => {
    const minimalData = { title: "Minimal task" };

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(minimalData);
    });

    expect(mockCreateTask).toHaveBeenCalledWith(minimalData);
  });

  it("should handle mutation with all optional fields", async () => {
    const fullData = {
      title: "Full task",
      dueDate: "2024-12-31",
      contactId: "contact1",
      dealId: "deal1",
      assignedToId: "user1",
      priority: "HIGH" as const,
      status: "IN_PROGRESS" as const,
    };

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(fullData);
    });

    expect(mockCreateTask).toHaveBeenCalledWith(fullData);
  });
});

describe("useUpdateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockUpdateTask.mockResolvedValue({
      task: { id: "task1", title: "Updated task", completed: true },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateTask with id and data object shape", async () => {
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    const updatePayload = {
      id: "task1",
      data: { title: "Updated title", priority: "HIGH" as const },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task1", {
      title: "Updated title",
      priority: "HIGH",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    const updatePayload = {
      id: "task1",
      data: { title: "Updated" },
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(updatePayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle partial updates with only some fields", async () => {
    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    const partialUpdate = {
      id: "task1",
      data: { completed: true },
    };

    await act(async () => {
      await result.current.mutateAsync(partialUpdate);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith("task1", { completed: true });
  });
});

describe("useCompleteTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCompleteTask.mockResolvedValue({
      task: { id: "task1", completed: true, status: "DONE" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call completeTask service with task id", async () => {
    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("task1");
    });

    expect(mockCompleteTask).toHaveBeenCalledWith("task1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("task1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle mutation with various task ids", async () => {
    const { result } = renderHook(() => useCompleteTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("task-uuid-12345");
    });

    expect(mockCompleteTask).toHaveBeenCalledWith("task-uuid-12345");
  });
});

describe("useDeleteTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteTask.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteTask service with task id", async () => {
    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("task1");
    });

    expect(mockDeleteTask).toHaveBeenCalledWith("task1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("task1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle successful deletion", async () => {
    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("task1");
    });

    expect(mockDeleteTask).toHaveBeenCalled();
  });
});

describe("useBulkCompleteTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockBulkCompleteTasks.mockResolvedValue({ count: 5 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call bulkCompleteTasks with array of task ids", async () => {
    const { result } = renderHook(() => useBulkCompleteTasks(), { wrapper });

    const taskIds = ["task1", "task2", "task3"];

    await act(async () => {
      await result.current.mutateAsync(taskIds);
    });

    expect(mockBulkCompleteTasks).toHaveBeenCalledWith(taskIds);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useBulkCompleteTasks(), { wrapper });

    const taskIds = ["task1", "task2"];

    await expect(
      act(async () => {
        await result.current.mutateAsync(taskIds);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle bulk completion with single task", async () => {
    mockBulkCompleteTasks.mockResolvedValue({ count: 1 });

    const { result } = renderHook(() => useBulkCompleteTasks(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(["task1"]);
    });

    expect(mockBulkCompleteTasks).toHaveBeenCalledWith(["task1"]);
  });

  it("should handle bulk completion with large batch of tasks", async () => {
    const largeTaskIdBatch = Array.from(
      { length: 100 },
      (_, i) => `task${i + 1}`,
    );

    mockBulkCompleteTasks.mockResolvedValue({ count: 100 });

    const { result } = renderHook(() => useBulkCompleteTasks(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(largeTaskIdBatch);
    });

    expect(mockBulkCompleteTasks).toHaveBeenCalledWith(largeTaskIdBatch);
  });
});

describe("useBulkDeleteTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockBulkDeleteTasks.mockResolvedValue({ count: 5 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call bulkDeleteTasks with ids and optional reason", async () => {
    const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper });

    const deletePayload = {
      ids: ["task1", "task2", "task3"],
      reason: "Duplicate entries",
    };

    await act(async () => {
      await result.current.mutateAsync(deletePayload);
    });

    expect(mockBulkDeleteTasks).toHaveBeenCalledWith(
      ["task1", "task2", "task3"],
      "Duplicate entries",
    );
  });

  it("should call bulkDeleteTasks with only ids when reason is not provided", async () => {
    const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper });

    const deletePayload = {
      ids: ["task1", "task2"],
    };

    await act(async () => {
      await result.current.mutateAsync(deletePayload);
    });

    expect(mockBulkDeleteTasks).toHaveBeenCalledWith(
      ["task1", "task2"],
      undefined,
    );
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper });

    const deletePayload = {
      ids: ["task1", "task2"],
      reason: "Cleanup",
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(deletePayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should handle bulk deletion with reason parameter", async () => {
    const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper });

    const deletePayload = {
      ids: ["task1", "task2", "task3"],
      reason: "Tasks completed",
    };

    await act(async () => {
      await result.current.mutateAsync(deletePayload);
    });

    expect(mockBulkDeleteTasks).toHaveBeenCalledWith(
      ["task1", "task2", "task3"],
      "Tasks completed",
    );
  });
});
