/**
 * Product bulk controller — re-exports from upload and download modules.
 * Keeps router imports unchanged; each sub-module stays under 300 lines.
 */
export { bulkUploadProducts } from "./product.bulk.upload.controller";
export {
  downloadBulkUploadTemplate,
  downloadProducts,
} from "./product.bulk.download.controller";
