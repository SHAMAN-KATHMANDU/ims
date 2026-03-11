import { BulkTypeSchema } from "./bulk.schema";

export class BulkService {
  /**
   * Parse and validate bulk type from path/query/body.
   * Returns validated type or null if invalid.
   */
  parseType(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const parsed = BulkTypeSchema.safeParse(value.toLowerCase().trim());
    return parsed.success ? parsed.data : null;
  }
}

export default new BulkService();
