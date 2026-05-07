import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSiteAnalytics,
  updateSiteAnalytics,
  type SiteAnalytics,
} from "../services/tenant-site.service";

export function useSiteAnalytics() {
  return useQuery({
    queryKey: ["site-analytics"],
    queryFn: () => getSiteAnalytics(),
  });
}

export function useUpdateSiteAnalytics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SiteAnalytics) => updateSiteAnalytics(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-analytics"] });
    },
  });
}
