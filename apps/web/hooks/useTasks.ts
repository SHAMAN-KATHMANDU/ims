"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  type TaskListParams,
  type CreateTaskData,
  type UpdateTaskData,
  type PaginatedTasksResponse,
} from "@/services/taskService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export type { TaskListParams, PaginatedTasksResponse };

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export interface UseTasksPaginatedOptions {
  initialData?: PaginatedTasksResponse;
}

export function useTasksPaginated(
  params: TaskListParams = {},
  options: UseTasksPaginatedOptions = {},
) {
  const normalizedParams = {
    page: params.page ?? DEFAULT_PAGE,
    limit: params.limit ?? DEFAULT_LIMIT,
    search: params.search ?? "",
    sortBy: params.sortBy ?? "dueDate",
    sortOrder: params.sortOrder ?? "asc",
    completed: params.completed,
    assignedToId: params.assignedToId,
    dueToday: params.dueToday,
  };
  return useQuery({
    queryKey: taskKeys.list(normalizedParams),
    queryFn: () => getTasks(normalizedParams),
    placeholderData: (prev) => prev,
    initialData: options.initialData,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTaskById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskData) => createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) =>
      updateTask(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}
