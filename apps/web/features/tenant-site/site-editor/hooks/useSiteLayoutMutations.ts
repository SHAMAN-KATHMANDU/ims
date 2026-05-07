/**
 * Mutations for saving, publishing, and discarding site layouts.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  upsertSiteLayoutDraft,
  publishSiteLayout,
  deleteSiteLayout,
} from "../../services/site-layouts.service";
import { siteLayoutKeys } from "./useSiteLayoutQuery";
import { useToast } from "@/hooks/useToast";

export function useSaveLayoutDraft(scope: SiteLayoutScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (blocks: BlockNode[]) => {
      return upsertSiteLayoutDraft({ scope, blocks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.scope(scope) });
      toast({
        title: "Draft saved",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save draft",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

export function usePublishLayout(scope: SiteLayoutScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return publishSiteLayout(scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.scope(scope) });
      toast({
        title: "Site published",
        description: "Your changes are now live",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to publish",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

export function useDiscardDraft(scope: SiteLayoutScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return deleteSiteLayout(scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.scope(scope) });
      toast({
        title: "Draft discarded",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to discard draft",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

export function useUnpublishLayout(scope: SiteLayoutScope) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return deleteSiteLayout(scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.scope(scope) });
      toast({
        title: "Site unpublished",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to unpublish",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}
