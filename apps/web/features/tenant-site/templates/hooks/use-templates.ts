"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { isAxiosError } from "axios";
import { pickSiteTemplate } from "../../services/tenant-site.service";
import { siteTemplatesService } from "../../services/site-templates.service";
import { useToast } from "@/hooks/useToast";
import { siteLayoutKeys } from "../../hooks/use-site-layouts";
import { tenantSiteKeys } from "../../hooks/use-tenant-site";
import type { UpdateTemplatePayload } from "../../services/site-templates.service";

export function useTemplatesQuery() {
  return useQuery({
    queryKey: tenantSiteKeys.templates(),
    queryFn: () => siteTemplatesService.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["template", id] as const,
    queryFn: () => siteTemplatesService.getById(id),
    enabled: !!id,
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const { toast } = useToast();

  return useMutation({
    mutationFn: (slug: string) => pickSiteTemplate(slug, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.all });
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.all });
      toast({ title: "Template applied successfully" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("site-template-picked"));
      }
      router.push(workspace ? `/${workspace}/site/dashboard` : "/");
    },
    onError: (error: unknown) => {
      console.error("[useApplyTemplate] failed", error);
      const message =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)
            ?.message) ||
        (error instanceof Error ? error.message : null) ||
        "Failed to apply template";
      toast({
        title: message,
        variant: "destructive",
      });
    },
  });
}

export function useForkTemplate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      siteTemplatesService.fork(id, { name }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.templates() });
      toast({ title: "Template forked successfully" });
      router.push(
        workspace ? `/${workspace}/site/templates/${template.id}/edit` : "/",
      );
    },
    onError: (error: unknown) => {
      const message =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)
            ?.message) ||
        (error instanceof Error ? error.message : null) ||
        "Failed to fork template";
      toast({
        title: message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTemplatePayload;
    }) => siteTemplatesService.update(id, payload),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.templates() });
      queryClient.invalidateQueries({
        queryKey: ["template", template.id],
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("site-template-picked"));
      }
      toast({ title: "Template updated successfully" });
    },
    onError: (error: unknown) => {
      const message =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)
            ?.message) ||
        (error instanceof Error ? error.message : null) ||
        "Failed to update template";
      toast({
        title: message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => siteTemplatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.templates() });
      toast({ title: "Template deleted successfully" });
      router.push(workspace ? `/${workspace}/site/templates` : "/");
    },
    onError: (error: unknown) => {
      const message =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)
            ?.message) ||
        (error instanceof Error ? error.message : null) ||
        "Failed to delete template";
      toast({
        title: message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCanonicalTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTemplatePayload;
    }) => siteTemplatesService.updateCanonical(id, payload),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.templates() });
      queryClient.invalidateQueries({
        queryKey: ["template", template.id],
      });
      toast({ title: "Template updated successfully" });
    },
    onError: (error: unknown) => {
      const message =
        (isAxiosError(error) &&
          (error.response?.data as { message?: string } | undefined)
            ?.message) ||
        (error instanceof Error ? error.message : null) ||
        "Failed to update template";
      toast({
        title: message,
        variant: "destructive",
      });
    },
  });
}

// Selector to prevent unnecessary re-renders
export const selectTemplatesData = (
  query: ReturnType<typeof useTemplatesQuery>,
) => query.data ?? [];
export const selectTemplatesLoading = (
  query: ReturnType<typeof useTemplatesQuery>,
) => query.isLoading;
export const selectTemplatesError = (
  query: ReturnType<typeof useTemplatesQuery>,
) => query.error;
