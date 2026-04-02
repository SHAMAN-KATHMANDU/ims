"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getWorkflows,
  getWorkflowTemplates,
  getWorkflowRuns,
  createWorkflow,
  installWorkflowTemplate,
  updateWorkflow,
  deleteWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type InstallWorkflowTemplateInput,
} from "../services/workflow.service";
import { useToast } from "@/hooks/useToast";
import { crmKeys } from "./use-crm";
import { dealKeys } from "./use-deals";
import { taskKeys } from "./use-tasks";

import type { GetWorkflowsParams } from "../services/workflow.service";

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: (params?: GetWorkflowsParams) =>
    [...workflowKeys.all, "list", params] as const,
  templates: () => [...workflowKeys.all, "templates"] as const,
  detail: (id: string) => [...workflowKeys.all, "detail", id] as const,
  runs: (id: string, limit?: number) =>
    [...workflowKeys.detail(id), "runs", limit] as const,
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

export function useWorkflowTemplates(options?: { enabled?: boolean }) {
  const workflowsEnabled = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  return useQuery({
    queryKey: workflowKeys.templates(),
    queryFn: () => getWorkflowTemplates(),
    staleTime: 10 * 60 * 1000,
    enabled: workflowsEnabled && (options?.enabled ?? true),
  });
}

export function useWorkflowRuns(
  id: string,
  params?: { limit?: number },
  options?: { enabled?: boolean },
) {
  const workflowsEnabled = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  return useQuery({
    queryKey: workflowKeys.runs(id, params?.limit),
    queryFn: () => getWorkflowRuns(id, params),
    enabled: workflowsEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateWorkflowInput) => createWorkflow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
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

export function useInstallWorkflowTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      templateKey,
      data,
    }: {
      templateKey: string;
      data?: InstallWorkflowTemplateInput;
    }) => installWorkflowTemplate(templateKey, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: workflowKeys.templates() });
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      toast({
        title:
          result.outcome === "reused"
            ? "Workflow template already installed"
            : result.outcome === "overwritten"
              ? "Workflow template updated"
              : "Workflow template installed successfully",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to install workflow template",
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
      qc.invalidateQueries({ queryKey: workflowKeys.templates() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
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
      qc.invalidateQueries({ queryKey: workflowKeys.templates() });
      qc.invalidateQueries({ queryKey: crmKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
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
