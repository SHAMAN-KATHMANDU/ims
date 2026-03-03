import prisma from "@/config/prisma";

/** Prisma model delegate names (camelCase) for trashable entities. */
export const TRASH_MODEL_KEYS = [
  "product",
  "category",
  "subCategory",
  "vendor",
  "member",
  "location",
  "promoCode",
  "company",
  "contact",
  "lead",
  "deal",
  "task",
  "activity",
  "pipeline",
] as const;

export type TrashModelKey = (typeof TRASH_MODEL_KEYS)[number];

/** Entity config: display type, Prisma model name, display name field, tenant scope. */
export interface TrashEntityConfig {
  type: string;
  model: TrashModelKey;
  nameField: string;
  tenantScope: "direct" | "category";
}

/** All trashable entities with their config. */
export const TRASH_ENTITY_CONFIGS: TrashEntityConfig[] = [
  {
    type: "Product",
    model: "product",
    nameField: "name",
    tenantScope: "direct",
  },
  {
    type: "Category",
    model: "category",
    nameField: "name",
    tenantScope: "direct",
  },
  {
    type: "SubCategory",
    model: "subCategory",
    nameField: "name",
    tenantScope: "category",
  },
  { type: "Vendor", model: "vendor", nameField: "name", tenantScope: "direct" },
  { type: "Member", model: "member", nameField: "name", tenantScope: "direct" },
  {
    type: "Location",
    model: "location",
    nameField: "name",
    tenantScope: "direct",
  },
  {
    type: "PromoCode",
    model: "promoCode",
    nameField: "code",
    tenantScope: "direct",
  },
  {
    type: "Company",
    model: "company",
    nameField: "name",
    tenantScope: "direct",
  },
  {
    type: "Contact",
    model: "contact",
    nameField: "firstName",
    tenantScope: "direct",
  },
  { type: "Lead", model: "lead", nameField: "name", tenantScope: "direct" },
  { type: "Deal", model: "deal", nameField: "name", tenantScope: "direct" },
  { type: "Task", model: "task", nameField: "title", tenantScope: "direct" },
  {
    type: "Activity",
    model: "activity",
    nameField: "subject",
    tenantScope: "direct",
  },
  {
    type: "Pipeline",
    model: "pipeline",
    nameField: "name",
    tenantScope: "direct",
  },
];

/** Domain object for a trashed item. */
export interface TrashItem {
  entityType: string;
  id: string;
  name: string;
  deletedAt: string;
}

/** Minimal delegate interface for typed model access. */
interface TrashDelegate {
  findMany: (args: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  }) => Promise<
    Array<{ id: string; deletedAt: Date | null; [k: string]: unknown }>
  >;
  findFirst: (args: {
    where: Record<string, unknown>;
  }) => Promise<{ id: string } | null>;
  update: (args: {
    where: { id: string };
    data: { deletedAt: null };
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
}

/** Get typed delegate for a trash model. */
function getDelegate(model: TrashModelKey): TrashDelegate | undefined {
  const client = prisma as unknown as Record<string, TrashDelegate | undefined>;
  return client[model];
}

export class TrashRepository {
  /** List all trashed items for the given entities, optionally filtered by entity type. */
  async findTrashed(
    tenantId: string,
    entityTypes: TrashEntityConfig[],
  ): Promise<TrashItem[]> {
    const allItems: TrashItem[] = [];

    for (const config of entityTypes) {
      const delegate = getDelegate(config.model);
      if (!delegate) continue;

      const where: Record<string, unknown> = {
        deletedAt: { not: null },
      };
      if (config.tenantScope === "category") {
        where.category = { tenantId };
      } else {
        where.tenantId = tenantId;
      }

      const select: Record<string, boolean> = {
        id: true,
        [config.nameField]: true,
        deletedAt: true,
      };
      if (config.type === "Contact") select.lastName = true;

      const rows = await delegate.findMany({ where, select });

      for (const row of rows) {
        const nameVal = row[config.nameField];
        const name =
          config.type === "Contact"
            ? [nameVal, (row as { lastName?: string }).lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || "—"
            : String(nameVal ?? "—");
        allItems.push({
          entityType: config.type,
          id: row.id,
          name,
          deletedAt: row.deletedAt?.toISOString() ?? "",
        });
      }
    }

    allItems.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
    return allItems;
  }

  /** Restore a trashed item (set deletedAt to null). Returns true if found and restored. */
  async restore(
    tenantId: string,
    id: string,
    config: TrashEntityConfig,
  ): Promise<boolean> {
    const delegate = getDelegate(config.model);
    if (!delegate) return false;

    const where: Record<string, unknown> = {
      id,
      deletedAt: { not: null },
    };
    if (config.tenantScope === "category") {
      where.category = { tenantId };
    } else {
      where.tenantId = tenantId;
    }

    const existing = await delegate.findFirst({ where });
    if (!existing) return false;

    await delegate.update({
      where: { id },
      data: { deletedAt: null },
    });
    return true;
  }

  /** Permanently delete a trashed item. Returns true if found and deleted. */
  async permanentlyDelete(
    tenantId: string,
    id: string,
    config: TrashEntityConfig,
  ): Promise<boolean> {
    const delegate = getDelegate(config.model);
    if (!delegate) return false;

    const where: Record<string, unknown> = {
      id,
      deletedAt: { not: null },
    };
    if (config.tenantScope === "category") {
      where.category = { tenantId };
    } else {
      where.tenantId = tenantId;
    }

    const existing = await delegate.findFirst({ where });
    if (!existing) return false;

    await delegate.delete({ where: { id } });
    return true;
  }
}

const trashRepository = new TrashRepository();
export default trashRepository;
