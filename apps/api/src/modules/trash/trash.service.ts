/**
 * Trash service - business logic for trash module.
 */

import type { TrashWhere, TrashSelect } from "./trash.repository";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { NotFoundError, DomainError } from "@/shared/errors";
import { trashRepository } from "./trash.repository";

export type TrashEntityConfig = {
  type: string;
  model: string;
  nameField: string;
  /** Build where clause for list (deletedAt + tenant scope). */
  getListWhere: (tenantId: string) => TrashWhere;
  /** Build where clause for restore/delete (id + deletedAt + tenant scope). */
  getItemWhere: (id: string, tenantId: string) => TrashWhere;
  /** Select fields for list. */
  getSelect: () => TrashSelect;
};

const TRASH_ENTITIES: TrashEntityConfig[] = [
  {
    type: "Product",
    model: "product",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Category",
    model: "category",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "SubCategory",
    model: "subCategory",
    nameField: "name",
    getListWhere: (tenantId) => ({
      deletedAt: { not: null },
      category: { tenantId },
    }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      category: { tenantId },
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Vendor",
    model: "vendor",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Member",
    model: "member",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Location",
    model: "location",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "PromoCode",
    model: "promoCode",
    nameField: "code",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, code: true, deletedAt: true }),
  },
  {
    type: "Company",
    model: "company",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Contact",
    model: "contact",
    nameField: "firstName",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({
      id: true,
      firstName: true,
      lastName: true,
      deletedAt: true,
    }),
  },
  {
    type: "Lead",
    model: "lead",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Deal",
    model: "deal",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
  {
    type: "Task",
    model: "task",
    nameField: "title",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, title: true, deletedAt: true }),
  },
  {
    type: "Activity",
    model: "activity",
    nameField: "subject",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, subject: true, deletedAt: true }),
  },
  {
    type: "Pipeline",
    model: "pipeline",
    nameField: "name",
    getListWhere: (tenantId) => ({ deletedAt: { not: null }, tenantId }),
    getItemWhere: (id, tenantId) => ({
      id,
      deletedAt: { not: null },
      tenantId,
    }),
    getSelect: () => ({ id: true, name: true, deletedAt: true }),
  },
];

const VALID_ENTITY_TYPES = new Set(
  TRASH_ENTITIES.map((e) => e.type.toLowerCase()),
);

export type TrashItem = {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string;
};

export type TrashListQuery = {
  page?: number;
  limit?: number;
  entityType?: string;
};

function rowToTrashItem(
  type: string,
  nameField: string,
  row: { id: string; deletedAt?: Date | null; [k: string]: unknown },
): TrashItem {
  const nameVal = row[nameField];
  const name =
    type === "Contact"
      ? [nameVal, (row as { lastName?: string }).lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "—"
      : String(nameVal ?? "—");
  return {
    entityType: type,
    id: row.id,
    name,
    deletedAt: row.deletedAt?.toISOString() ?? "",
  };
}

export const trashService = {
  getValidEntityTypes(): Set<string> {
    return new Set(VALID_ENTITY_TYPES);
  },

  async list(tenantId: string, query: TrashListQuery) {
    const { page, limit } = getPaginationParams(query);
    const entityTypeFilter = query.entityType?.toLowerCase();

    const entitiesToQuery = entityTypeFilter
      ? TRASH_ENTITIES.filter((e) => e.type.toLowerCase() === entityTypeFilter)
      : TRASH_ENTITIES;

    if (entityTypeFilter && entitiesToQuery.length === 0) {
      throw new DomainError(
        400,
        `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      );
    }

    const allItems: TrashItem[] = [];

    for (const config of entitiesToQuery) {
      const where = config.getListWhere(tenantId);
      const select = config.getSelect();
      const rows = await trashRepository.findTrashedItems(
        config.model,
        where,
        select,
      );
      for (const row of rows) {
        allItems.push(rowToTrashItem(config.type, config.nameField, row));
      }
    }

    allItems.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );

    const totalItems = allItems.length;
    const skip = (page - 1) * limit;
    const paginatedItems = allItems.slice(skip, skip + limit);
    const result = createPaginationResult(
      paginatedItems,
      totalItems,
      page,
      limit,
    );
    return { data: result.data, pagination: result.pagination };
  },

  async restore(entityType: string, id: string, tenantId: string) {
    const config = TRASH_ENTITIES.find(
      (e) => e.type.toLowerCase() === entityType.toLowerCase(),
    );
    if (!config) {
      throw new DomainError(
        400,
        `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      );
    }

    const where = config.getItemWhere(id, tenantId);
    const existing = await trashRepository.findFirstTrashed(
      config.model,
      where,
    );
    if (!existing) {
      throw new NotFoundError("Item not found or not in trash");
    }

    await trashRepository.restore(config.model, id, { deletedAt: null });
    return { type: config.type };
  },

  async permanentlyDelete(entityType: string, id: string, tenantId: string) {
    const config = TRASH_ENTITIES.find(
      (e) => e.type.toLowerCase() === entityType.toLowerCase(),
    );
    if (!config) {
      throw new DomainError(
        400,
        `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      );
    }

    const where = config.getItemWhere(id, tenantId);
    const existing = await trashRepository.findFirstTrashed(
      config.model,
      where,
    );
    if (!existing) {
      throw new NotFoundError("Item not found or not in trash");
    }

    await trashRepository.deletePermanently(config.model, id);
    return { type: config.type };
  },
};
