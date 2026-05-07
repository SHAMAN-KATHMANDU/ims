import { useQuery } from "@tanstack/react-query";
import { listSiteTemplates } from "../services/tenant-site.service";

export function useTemplatesQuery() {
  return useQuery({
    queryKey: ["site-templates"],
    queryFn: () => listSiteTemplates(),
  });
}
