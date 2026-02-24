/**
 * Member controller — re-exports from crud and bulk modules.
 * Keeps router imports unchanged; each sub-module stays under 300 lines.
 */
import memberCrud from "./member.crud.controller";
import { bulkUploadMembers } from "./member.bulk.upload.controller";
import {
  downloadBulkUploadTemplate,
  downloadMembers,
} from "./member.bulk.download.controller";

export default {
  ...memberCrud,
  bulkUploadMembers,
  downloadBulkUploadTemplate,
  downloadMembers,
};
