"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getPipelines,
  getPipelineById,
  getPipelineTemplates,
  createPipeline,
  updatePipeline,
  deletePipeline,
  seedPipelineFramework,
  type PipelineStage,
  type PipelineType,
  type GetPipelinesParams,
} from "../services/pipeline.service";
import { contactKeys } from "./use-contacts";
import { crmSettingsKeys } from "./use-crm-settings";
import { workflowKeys } from "./use-workflows";
import { dealKeys } from "./use-deals";
import { taskKeys } from "./use-tasks";

export const pipelineKeys = {
  all: ["pipelines"] as const,
  lists: (params?: GetPipelinesParams) =>
    [...pipelineKeys.all, "list", params] as const,
  templates: () => [...pipelineKeys.all, "templates"] as const,
  details: () => [...pipelineKeys.all, "detail"] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
};

export function usePipelines(
  params?: GetPipelinesParams,
  options?: { enabled?: boolean },
) {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useQuery({
    queryKey: pipelineKeys.lists(params),
    queryFn: () => getPipelines(params),
    enabled: pipelinesEnabled && (options?.enabled ?? true),
  });
}

export function usePipelineTemplates(options?: { enabled?: boolean }) {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useQuery({
    queryKey: pipelineKeys.templates(),
    queryFn: () => getPipelineTemplates(),
    staleTime: 60 * 60 * 1000,
    enabled: pipelinesEnabled && (options?.enabled ?? true),
  });
}

export function usePipeline(id: string, options?: { enabled?: boolean }) {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: () => getPipelineById(id),
    enabled: pipelinesEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreatePipeline() {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type?: PipelineType;
      stages?: PipelineStage[];
      isDefault?: boolean;
      closedWonStageName?: string | null;
      closedLostStageName?: string | null;
    }) => {
      if (!pipelinesEnabled)
        throw new Error("Feature disabled: CRM_PIPELINES_TAB");
      return createPipeline(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.lists() }),
  });
}

export function useUpdatePipeline() {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        stages?: PipelineStage[];
        isDefault?: boolean;
        closedWonStageName?: string | null;
        closedLostStageName?: string | null;
      };
    }) => {
      if (!pipelinesEnabled)
        throw new Error("Feature disabled: CRM_PIPELINES_TAB");
      return updatePipeline(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lists() });
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
    },
  });
}

export function useDeletePipeline() {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!pipelinesEnabled)
        throw new Error("Feature disabled: CRM_PIPELINES_TAB");
      return deletePipeline(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.lists() }),
  });
}

export function useSeedPipelineFramework() {
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!pipelinesEnabled)
        throw new Error("Feature disabled: CRM_PIPELINES_TAB");
      return seedPipelineFramework();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lists() });
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: crmSettingsKeys.all });
      qc.invalidateQueries({ queryKey: workflowKeys.all });
      qc.invalidateQueries({ queryKey: dealKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
