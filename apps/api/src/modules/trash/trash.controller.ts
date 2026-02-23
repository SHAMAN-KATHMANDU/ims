import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

/** Entity types that support trash, mapped to Prisma model names and display name fields.
 *  `tenantScope` controls how tenant filtering works:
 *    - "direct" (default): model has its own tenantId column
 *    - "category": SubCategory -- scoped via parent category's tenantId
 */
const TRASH_ENTITIES = [
  {
    type: "Product",
    model: "product" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Category",
    model: "category" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "SubCategory",
    model: "subCategory" as const,
    nameField: "name",
    tenantScope: "category" as const,
  },
  {
    type: "Vendor",
    model: "vendor" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Member",
    model: "member" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Location",
    model: "location" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "PromoCode",
    model: "promoCode" as const,
    nameField: "code",
    tenantScope: "direct" as const,
  },
  {
    type: "Company",
    model: "company" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Contact",
    model: "contact" as const,
    nameField: "firstName",
    tenantScope: "direct" as const,
  },
  {
    type: "Lead",
    model: "lead" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Deal",
    model: "deal" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
  {
    type: "Task",
    model: "task" as const,
    nameField: "title",
    tenantScope: "direct" as const,
  },
  {
    type: "Activity",
    model: "activity" as const,
    nameField: "subject",
    tenantScope: "direct" as const,
  },
  {
    type: "Pipeline",
    model: "pipeline" as const,
    nameField: "name",
    tenantScope: "direct" as const,
  },
] as const;

const VALID_ENTITY_TYPES = new Set(
  TRASH_ENTITIES.map((e) => e.type.toLowerCase()),
);

type TrashItem = {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string;
};

/**
 * List trashed items across entity types. Supports filtering by entityType and pagination.
 */
async function listTrash(req: Request, res: Response) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const entityTypeFilter = (req.query.entityType as string)?.toLowerCase();

    const entitiesToQuery = entityTypeFilter
      ? TRASH_ENTITIES.filter((e) => e.type.toLowerCase() === entityTypeFilter)
      : TRASH_ENTITIES;

    if (entityTypeFilter && entitiesToQuery.length === 0) {
      return res.status(400).json({
        message: `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      });
    }

    const tenantId = req.user!.tenantId;
    const allItems: TrashItem[] = [];

    for (const { type, model, nameField, tenantScope } of entitiesToQuery) {
      const client = prisma as any;
      const delegate = client[model];
      if (!delegate) continue;

      const where: Record<string, unknown> = {
        deletedAt: { not: null },
      };

      if (tenantScope === "category") {
        where.category = { tenantId };
      } else {
        where.tenantId = tenantId;
      }

      const select: Record<string, boolean> = {
        id: true,
        [nameField]: true,
        deletedAt: true,
      };
      if (type === "Contact") select.lastName = true;

      const rows = await delegate.findMany({
        where,
        select,
      });

      for (const row of rows) {
        const nameVal = row[nameField];
        allItems.push({
          entityType: type,
          id: row.id,
          name:
            type === "Contact"
              ? [nameVal, (row as { lastName?: string }).lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "—"
              : String(nameVal ?? "—"),
          deletedAt: row.deletedAt?.toISOString() ?? "",
        });
      }
    }

    // Sort by deletedAt descending (newest first)
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

    res.status(200).json({
      message: "Trash items retrieved",
      ...result,
    });
  } catch (error: unknown) {
    return sendControllerError(req, res, error, "List trash error");
  }
}

/**
 * Restore a trashed item (set deletedAt to null).
 */
async function restoreItem(req: Request, res: Response) {
  try {
    const entityType = (req.params.entityType as string)?.toLowerCase();
    const id = req.params.id;

    if (!entityType || !id) {
      return res.status(400).json({
        message: "entityType and id are required",
      });
    }

    const config = TRASH_ENTITIES.find(
      (e) => e.type.toLowerCase() === entityType,
    );
    if (!config) {
      return res.status(400).json({
        message: `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      });
    }

    const tenantId = req.user!.tenantId;
    const client = prisma as any;
    const delegate = client[config.model];
    if (!delegate) {
      return res.status(500).json({ message: "Entity model not found" });
    }

    const where: Record<string, unknown> = { id, deletedAt: { not: null } };
    if (config.tenantScope === "category") {
      where.category = { tenantId };
    } else {
      where.tenantId = tenantId;
    }

    const existing = await delegate.findFirst({ where });

    if (!existing) {
      return res.status(404).json({
        message: "Item not found or not in trash",
      });
    }

    await delegate.update({
      where: { id },
      data: { deletedAt: null },
    });

    res.status(200).json({
      message: `${config.type} restored successfully`,
    });
  } catch (error: unknown) {
    return sendControllerError(req, res, error, "Restore item error");
  }
}

/**
 * Permanently delete a trashed item.
 */
async function permanentlyDeleteItem(req: Request, res: Response) {
  try {
    const entityType = (req.params.entityType as string)?.toLowerCase();
    const id = req.params.id;

    if (!entityType || !id) {
      return res.status(400).json({
        message: "entityType and id are required",
      });
    }

    const config = TRASH_ENTITIES.find(
      (e) => e.type.toLowerCase() === entityType,
    );
    if (!config) {
      return res.status(400).json({
        message: `Invalid entityType. Valid values: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`,
      });
    }

    const tenantId = req.user!.tenantId;
    const client = prisma as any;
    const delegate = client[config.model];
    if (!delegate) {
      return res.status(500).json({ message: "Entity model not found" });
    }

    const where: Record<string, unknown> = { id, deletedAt: { not: null } };
    if (config.tenantScope === "category") {
      where.category = { tenantId };
    } else {
      where.tenantId = tenantId;
    }

    const existing = await delegate.findFirst({ where });

    if (!existing) {
      return res.status(404).json({
        message: "Item not found or not in trash",
      });
    }

    await delegate.delete({
      where: { id },
    });

    res.status(200).json({
      message: `${config.type} permanently deleted`,
    });
  } catch (error: unknown) {
    return sendControllerError(
      req,
      res,
      error,
      "Permanently delete item error",
    );
  }
}

const trashController = {
  listTrash,
  restoreItem,
  permanentlyDeleteItem,
};

export default trashController;
