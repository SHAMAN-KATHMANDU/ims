export { TenantPagesPage } from "./components/TenantPagesPage";
export { TenantPageEditor } from "./components/TenantPageEditor";

export {
  useTenantPages,
  useTenantPage,
  useCreateTenantPage,
  useUpdateTenantPage,
  usePublishTenantPage,
  useUnpublishTenantPage,
  useDeleteTenantPage,
  useReorderTenantPages,
  tenantPagesKeys,
} from "./hooks/use-tenant-pages";

export type {
  TenantPage,
  TenantPageListItem,
  TenantPageLayoutVariant,
  CreateTenantPageData,
  UpdateTenantPageData,
} from "./services/tenant-pages.service";

export {
  TenantPageFormSchema,
  RESERVED_SLUGS,
  slugifyTitle,
  pageSeoPreview,
  type TenantPageFormInput,
} from "./validation";
