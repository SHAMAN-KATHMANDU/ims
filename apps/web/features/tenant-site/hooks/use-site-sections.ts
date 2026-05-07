import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteConfig, useUpdateSiteConfig } from "./use-tenant-site";

export function useSiteSections() {
  const siteQuery = useSiteConfig();
  return {
    ...siteQuery,
    data: (siteQuery.data?.features as Record<string, unknown> | null) ?? {},
  };
}

export function useUpdateSiteSections() {
  const updateConfig = useUpdateSiteConfig();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sections: Record<string, unknown>) =>
      updateConfig.mutateAsync({ features: sections }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
    },
  });
}
