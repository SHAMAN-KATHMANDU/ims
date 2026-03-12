"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
} from "../services/workflow.service";

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: (pipelineId?: string) =>
    pipelineId
      ? ([...workflowKeys.all, "list", pipelineId] as const)
      : ([...workflowKeys.all, "list"] as const),
  detail: (id: string) => [...workflowKeys.all, "detail", id] as const,
};

export function useWorkflows(pipelineId?: string) {
  return useQuery({
    queryKey: workflowKeys.lists(pipelineId),
    queryFn: () => getWorkflows(pipelineId),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => getWorkflowById(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowInput) => createWorkflow(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowInput }) =>
      updateWorkflow(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.all });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}
