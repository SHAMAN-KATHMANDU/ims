export { BlockRenderer } from "./BlockRenderer";
export type { BlockRendererProps } from "./BlockRenderer";
export { blockRegistry } from "./registry";
export type {
  BlockComponentProps,
  BlockComponent,
  BlockDataContext,
  BlockRegistryEntry,
} from "./types";
export { MOCK_DATA_CONTEXT } from "./preview-fixtures";
export { resolveImageUrl, normalizeImageRef } from "./utils/image";
export type { ImageResolveOptions } from "./utils/image";
export {
  formatPrice,
  getSiteFormatOptions,
  FALLBACK_PRICE,
} from "./utils/format";
export type { FormatPriceOptions } from "./utils/format";

// Form block helpers — re-used by the tenant-site renderer + admin
// inspector preview so both render fields with identical behaviour.
export { FormFields } from "./components/content/form/FormFields";
export { validateFormFields } from "./components/content/form/validate";
