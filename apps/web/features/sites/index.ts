export { TenantDomainsPage } from "./components/TenantDomainsPage";
export { TenantWebsitePage } from "./components/TenantWebsitePage";
export { TenantNavTabs } from "./components/TenantNavTabs";

export {
  useTenantDomains,
  useCreateTenantDomain,
  useUpdateTenantDomain,
  useDeleteTenantDomain,
  useDomainVerificationInstructions,
  useVerifyTenantDomain,
  tenantDomainKeys,
} from "./hooks/use-tenant-domains";

export {
  useMyDomains,
  useAddMyDomain,
  useDeleteMyDomain,
  useMyDomainVerificationInstructions,
  useVerifyMyDomain,
  myDomainKeys,
} from "./hooks/use-my-domains";

export {
  useTenantSiteConfig,
  useEnableTenantWebsite,
  useDisableTenantWebsite,
  useSiteTemplates,
  tenantWebsiteKeys,
} from "./hooks/use-tenant-website";

export type {
  TenantDomain,
  TenantDomainApp,
  CreateTenantDomainData,
  UpdateTenantDomainData,
  DomainVerificationInstructions,
} from "./hooks/use-tenant-domains";

export type {
  TenantSiteConfig,
  SiteTemplate,
} from "./hooks/use-tenant-website";
