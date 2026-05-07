import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  unpublishSite,
  pickSiteTemplate,
  type SiteConfig,
} from "../services/tenant-site.service";

export function useUnpublishSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unpublishSite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
}

export function useResetToTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => pickSiteTemplate(slug, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      queryClient.invalidateQueries({ queryKey: ["site-layouts"] });
    },
  });
}
