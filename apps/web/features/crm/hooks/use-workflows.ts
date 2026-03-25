"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
} from "../services/workflow.service";
import { useToast } from "@/hooks/useToast";

import type { GetWorkflowsParams } from "../services/workflow.service";

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: (params?: GetWorkflowsParams) =>
    [...workflowKeys.all, "list", params] as const,
  detail: (id: string) => [...workflowKeys.all, "detail", id] as const,
};

export function useWorkflows(
  params?: GetWorkflowsParams,
  options?: { enabled?: boolean },
) {
  const workflowsEnabled = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  return useQuery({
    queryKey: workflowKeys.lists(params),
    queryFn: () => getWorkflows(params),
    staleTime: 2 * 60 * 1000,
    enabled: workflowsEnabled && (options?.enabled ?? true),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateWorkflowInput) => createWorkflow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      toast({ title: "Workflow created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowInput }) =>
      updateWorkflow(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      toast({ title: "Workflow updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      toast({ title: "Workflow deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
