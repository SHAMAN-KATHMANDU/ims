// Re-export from sites feature
import * as domainsHooks from "@/features/sites/hooks/use-my-domains";
export const useMyDomains = domainsHooks.useMyDomains;
export const useDeleteMyDomain = domainsHooks.useDeleteMyDomain;
export const useAddMyDomain = domainsHooks.useAddMyDomain;
export const useVerifyMyDomain = domainsHooks.useVerifyMyDomain;
