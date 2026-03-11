/**
 * Bulk module has no database access — returns allowed bulk types.
 * Repository exists to satisfy 6-file architecture pattern.
 */

import { BULK_TYPES } from "./bulk.schema";

export class BulkRepository {
  getAllowedTypes(): readonly string[] {
    return BULK_TYPES;
  }
}

export default new BulkRepository();
