"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFeatureFlag } from "@/features/flags";
import { Feature } from "@repo/shared";
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
import { dealKeys } from "./use-deals";
import { crmKeys } from "./use-crm";
import { workflowKeys } from "./use-workflows";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useTasksPaginated(
  params: TaskListParams = {},
  options?: { enabled?: boolean },
) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: taskKeys.list({
      page: params.page ?? DEFAULT_PAGE,
      limit: params.limit ?? DEFAULT_LIMIT,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
      completed: params.completed,
      assignedToId: params.assignedToId,
      dueToday: params.dueToday,
      contactId: params.contactId,
      dealId: params.dealId,
      orphaned: params.orphaned,
    }),
    queryFn: () => getTasks(params),
    placeholderData: (prev) => prev,
    enabled: crmEnabled && (options?.enabled ?? true),
  });
}

export function useTask(id: string, options?: { enabled?: boolean }) {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTaskById(id),
    enabled: crmEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreateTask() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskData) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return createTask(data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: workflowKeys.all });
      if (variables.contactId) {
        qc.refetchQueries({
          queryKey: contactKeys.detail(variables.contactId),
          type: "active",
        });
      }
      if (variables.dealId) {
        qc.invalidateQueries({
          queryKey: dealKeys.detail(variables.dealId),
        });
      }
    },
  });
}

export function useUpdateTask() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return updateTask(id, data);
    },
    onSuccess: (data, { id, data: updateData }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      const contactId =
        (data as { task?: { contactId?: string | null } })?.task?.contactId ??
        updateData?.contactId;
      if (contactId) {
        qc.refetchQueries({
          queryKey: contactKeys.detail(contactId),
          type: "active",
        });
      }
    },
  });
}

export function useCompleteTask() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return completeTask(id);
    },
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      const contactId = (data as { task?: { contactId?: string | null } })?.task
        ?.contactId;
      if (contactId) {
        qc.refetchQueries({
          queryKey: contactKeys.detail(contactId),
          type: "active",
        });
      }
    },
  });
}

export function useDeleteTask() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return deleteTask(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useBulkCompleteTasks() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return bulkCompleteTasks(ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}

export function useBulkDeleteTasks() {
  const crmEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => {
      if (!crmEnabled) throw new Error("Feature disabled: SALES_PIPELINE");
      return bulkDeleteTasks(ids, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
    },
  });
}
