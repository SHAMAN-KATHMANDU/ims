"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  bulkCompleteTasks,
  bulkDeleteTasks,
  type TaskListParams,
  type CreateTaskData,
  type UpdateTaskData,
} from "../services/task.service";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { contactKeys } from "./use-contacts";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useTasksPaginated(params: TaskListParams = {}) {
  return useQuery({
    queryKey: taskKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "dueDate",
      sortOrder: params.sortOrder ?? "asc",
      completed: params.completed,
      assignedToId: params.assignedToId,
      dueToday: params.dueToday,
      contactId: params.contactId,
      dealId: params.dealId,
      orphaned: params.orphaned,
    }),
    queryFn: () => getTasks(params),
    placeholderData: (prev) => prev,
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      if (variables.contactId) {
        qc.invalidateQueries({
          queryKey: contactKeys.detail(variables.contactId),
        });
      }
    },
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

export function useBulkCompleteTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkCompleteTasks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      reason,
    }: {
      ids: string[];
      reason?: string;
    }) => bulkDeleteTasks(ids, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}
