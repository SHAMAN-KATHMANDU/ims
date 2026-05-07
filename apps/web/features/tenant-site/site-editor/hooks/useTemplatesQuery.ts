/**
 * Templates dock query hook.
 * Lists site templates + apply (reuse existing useSiteTemplates/usePickSiteTemplate).
 */

export {
  useSiteTemplates,
  usePickSiteTemplate,
  type SiteTemplate,
} from "../../hooks/use-tenant-site";

export const templateKeys = {
  all: ["templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
};
