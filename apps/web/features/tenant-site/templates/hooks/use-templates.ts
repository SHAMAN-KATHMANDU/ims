"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  listSiteTemplates,
  pickSiteTemplate,
} from "../../services/tenant-site.service";
import { useToast } from "@/hooks/useToast";
import { siteLayoutKeys } from "../../hooks/use-site-layouts";
import { tenantSiteKeys } from "../../hooks/use-tenant-site";

export function useTemplatesQuery() {
  return useQuery({
    queryKey: tenantSiteKeys.templates(),
    queryFn: listSiteTemplates,
    staleTime: 5 * 60 * 1000,
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  const router = useRouter();
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
      router.push("/content/dashboard");
    },
    onError: () => {
      toast({
        title: "Failed to apply template",
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
