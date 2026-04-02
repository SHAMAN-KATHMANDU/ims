"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import { useToast } from "@/hooks/useToast";
import {
  archiveAutomationDefinition,
  createAutomationDefinition,
  getAutomationDefinitions,
  getAutomationRuns,
  replayAutomationEvent,
  type CreateAutomationDefinitionInput,
  type GetAutomationDefinitionsParams,
  type ReplayAutomationEventInput,
  type UpdateAutomationDefinitionInput,
  updateAutomationDefinition,
} from "../services/automation.service";

export const automationKeys = {
  all: ["automation"] as const,
  lists: (params?: GetAutomationDefinitionsParams) =>
    [...automationKeys.all, "list", params] as const,
  detail: (id: string) => [...automationKeys.all, "detail", id] as const,
  runs: (id: string, limit?: number) =>
    [...automationKeys.detail(id), "runs", limit] as const,
};

export function useAutomationDefinitions(
  params?: GetAutomationDefinitionsParams,
  options?: { enabled?: boolean },
) {
  const enabled = useEnvFeatureFlag(EnvFeature.AUTOMATION);
  return useQuery({
    queryKey: automationKeys.lists(params),
    queryFn: () => getAutomationDefinitions(params),
    enabled: enabled && (options?.enabled ?? true),
  });
}

export function useAutomationRuns(
  id: string,
  params?: { limit?: number },
  options?: { enabled?: boolean },
) {
  const enabled = useEnvFeatureFlag(EnvFeature.AUTOMATION);
  return useQuery({
    queryKey: automationKeys.runs(id, params?.limit),
    queryFn: () => getAutomationRuns(id, params),
    enabled: enabled && !!id && (options?.enabled ?? true),
  });
}

export function useCreateAutomationDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateAutomationDefinitionInput) =>
      createAutomationDefinition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast({ title: "Automation created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAutomationDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAutomationDefinitionInput;
    }) => updateAutomationDefinition(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      queryClient.invalidateQueries({ queryKey: automationKeys.detail(id) });
      toast({ title: "Automation updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useArchiveAutomationDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => archiveAutomationDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast({ title: "Automation archived" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReplayAutomationEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload?: ReplayAutomationEventInput;
    }) => replayAutomationEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast({ title: "Automation replay queued" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to replay automation event",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
