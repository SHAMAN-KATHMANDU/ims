import {
  getPaginationParams,
  createPaginationResult,
  type PaginationResult,
} from "@/utils/pagination";
import trashRepository, {
  TRASH_ENTITY_CONFIGS,
  type TrashEntityConfig,
  type TrashItem,
} from "./trash.repository";
import { createError } from "@/middlewares/errorHandler";

const VALID_ENTITY_TYPES = new Set(
  TRASH_ENTITY_CONFIGS.map((e) => e.type.toLowerCase()),
);

export interface ListTrashParams {
  page?: number;
  limit?: number;
  entityType?: string;
}

export interface ListTrashResult extends PaginationResult<TrashItem> {
  message: string;
}

export class TrashService {
  constructor(private repo: typeof trashRepository) {}

  /** List trashed items with pagination. Optionally filter by entityType. */
  async list(
    tenantId: string,
    params: ListTrashParams,
  ): Promise<ListTrashResult> {
    const { page, limit } = getPaginationParams(
      params as Record<string, unknown>,
    );
    const entityTypeFilter = params.entityType?.toLowerCase();

    const entitiesToQuery = entityTypeFilter
      ? TRASH_ENTITY_CONFIGS.filter(
          (e) => e.type.toLowerCase() === entityTypeFilter,
        )
      : TRASH_ENTITY_CONFIGS;

    if (entityTypeFilter && entitiesToQuery.length === 0) {
      throw createError(
        `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
        400,
      );
    }

    const allItems = await this.repo.findTrashed(tenantId, entitiesToQuery);
    const totalItems = allItems.length;
    const skip = (page - 1) * limit;
    const paginatedItems = allItems.slice(skip, skip + limit);

    const result = createPaginationResult(
      paginatedItems,
      totalItems,
      page,
      limit,
    );

    return {
      message: "Trash items retrieved",
      ...result,
    };
  }

  /** Restore a trashed item. Throws if not found or invalid entity type. */
  async restore(
    tenantId: string,
    entityType: string,
    id: string,
  ): Promise<{ type: string }> {
    const config = this.getEntityConfig(entityType);
    const restored = await this.repo.restore(tenantId, id, config);
    if (!restored) {
      throw createError("Item not found or not in trash", 404);
    }
    return { type: config.type };
  }

  /** Permanently delete a trashed item. Throws if not found or invalid entity type. */
  async permanentlyDelete(
    tenantId: string,
    entityType: string,
    id: string,
  ): Promise<{ type: string }> {
    const config = this.getEntityConfig(entityType);
    const deleted = await this.repo.permanentlyDelete(tenantId, id, config);
    if (!deleted) {
      throw createError("Item not found or not in trash", 404);
    }
    return { type: config.type };
  }

  private getEntityConfig(entityType: string): TrashEntityConfig {
    const config = TRASH_ENTITY_CONFIGS.find(
      (e) => e.type.toLowerCase() === entityType.toLowerCase(),
    );
    if (!config) {
      throw createError(
        `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
        400,
      );
    }
    return config;
  }
}

const trashService = new TrashService(trashRepository);
export default trashService;
