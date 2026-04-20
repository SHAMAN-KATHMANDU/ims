"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import { useToast } from "@/hooks/useToast";
import {
  archiveAutomationDefinition,
  bulkToggleAutomations,
  createAutomationDefinition,
  getAutomationAnalytics,
  getAutomationDefinitions,
  getAutomationRuns,
  replayAutomationEvent,
  testAutomationDefinition,
  toggleAutomationDefinition,
  type CreateAutomationDefinitionInput,
  type GetAutomationDefinitionsParams,
  type ReplayAutomationEventInput,
  type TestAutomationInput,
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
  analytics: (id: string) =>
    [...automationKeys.detail(id), "analytics"] as const,
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

export function useToggleAutomationDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "ACTIVE" | "INACTIVE";
    }) => toggleAutomationDefinition(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast({
        title:
          status === "ACTIVE" ? "Automation activated" : "Automation paused",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to toggle automation",
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      if (result.mode === "resume" && result.resumedRuns != null) {
        toast({
          title: `Resumed ${result.resumedRuns} failed run(s)`,
        });
      } else {
        toast({ title: "Automation replay queued" });
      }
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

export function useAutomationAnalytics(
  id: string,
  options?: { enabled?: boolean },
) {
  const enabled = useEnvFeatureFlag(EnvFeature.AUTOMATION);
  return useQuery({
    queryKey: automationKeys.analytics(id),
    queryFn: () => getAutomationAnalytics(id),
    enabled: enabled && !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBulkToggleAutomations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      ids,
      status,
    }: {
      ids: string[];
      status: "ACTIVE" | "INACTIVE";
    }) => bulkToggleAutomations(ids, status),
    onSuccess: (result, { status }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.all });
      toast({
        title: `${result.updated} automation(s) ${status === "ACTIVE" ? "activated" : "paused"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk toggle failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTestAutomationDefinition() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TestAutomationInput }) =>
      testAutomationDefinition(id, input),
    onSuccess: () => {
      toast({ title: "Test run started (shadow mode)" });
    },
    onError: (error: Error) => {
      toast({
        title: "Test run failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
