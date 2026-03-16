"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  seedPipelineFramework,
  type PipelineStage,
  type GetPipelinesParams,
} from "../services/pipeline.service";

export const pipelineKeys = {
  all: ["pipelines"] as const,
  lists: (params?: GetPipelinesParams) =>
    [...pipelineKeys.all, "list", params] as const,
  details: () => [...pipelineKeys.all, "detail"] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
};

export function usePipelines(params?: GetPipelinesParams) {
  return useQuery({
    queryKey: pipelineKeys.lists(params),
    queryFn: () => getPipelines(params),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: () => getPipelineById(id),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      stages?: PipelineStage[];
      isDefault?: boolean;
    }) => createPipeline(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.lists() }),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; stages?: PipelineStage[]; isDefault?: boolean };
    }) => updatePipeline(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lists() });
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
    },
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.lists() }),
  });
}

export function useSeedPipelineFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => seedPipelineFramework(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.lists() });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["crm-settings"] });
    },
  });
}
