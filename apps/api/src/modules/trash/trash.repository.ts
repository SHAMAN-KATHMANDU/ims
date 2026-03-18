import { basePrisma } from "@/config/prisma";

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
  deletedBy: string | null;
  deleteReason: string | null;
  tenantId: string;
  tenantName: string;
}

/** Minimal delegate interface for typed model access. */
interface TrashDelegate {
  findMany: (args: {
    where: Record<string, unknown>;
    select?: Record<string, boolean | object>;
    include?: Record<string, unknown>;
  }) => Promise<
    Array<{
      id: string;
      deletedAt: Date | null;
      deletedBy?: string | null;
      deleteReason?: string | null;
      tenantId?: string;
      [k: string]: unknown;
    }>
  >;
  findFirst: (args: {
    where: Record<string, unknown>;
  }) => Promise<{ id: string } | null>;
  update: (args: {
    where: { id: string };
    data: { deletedAt: null; deletedBy?: null; deleteReason?: null };
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
}

/** Get typed delegate for a trash model. Uses basePrisma so platform trash sees all tenants (no tenant/deletedAt injection). */
function getDelegate(model: TrashModelKey): TrashDelegate | undefined {
  const client = basePrisma as unknown as Record<
    string,
    TrashDelegate | undefined
  >;
  return client[model];
}

export class TrashRepository {
  /** List trashed items across all tenants (platform scope). Optional tenantId, search, and deleted date range. */
  async findTrashed(
    entityTypes: TrashEntityConfig[],
    filterTenantId?: string,
    search?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<TrashItem[]> {
    const allItems: TrashItem[] = [];

    const deletedAtClause: Record<string, unknown> = { not: null };
    if (dateFrom) (deletedAtClause as { gte?: Date }).gte = dateFrom;
    if (dateTo) (deletedAtClause as { lte?: Date }).lte = dateTo;

    for (const config of entityTypes) {
      const delegate = getDelegate(config.model);
      if (!delegate) continue;

      const where: Record<string, unknown> = {
        deletedAt: deletedAtClause,
      };
      if (filterTenantId) {
        if (config.tenantScope === "category") {
          where.category = { tenantId: filterTenantId };
        } else {
          where.tenantId = filterTenantId;
        }
      }
      if (search && search.trim()) {
        const term = search.trim();
        if (config.type === "Contact") {
          where.OR = [
            {
              firstName: { contains: term, mode: "insensitive" as const },
            },
            {
              lastName: { contains: term, mode: "insensitive" as const },
            },
          ];
        } else {
          (where as Record<string, unknown>)[config.nameField] = {
            contains: term,
            mode: "insensitive" as const,
          };
        }
      }

      const select: Record<string, boolean | object> = {
        id: true,
        [config.nameField]: true,
        deletedAt: true,
        deletedBy: true,
        deleteReason: true,
      };
      if (config.type === "Contact")
        (select as Record<string, unknown>).lastName = true;

      if (config.tenantScope === "category") {
        (select as Record<string, unknown>).category = {
          select: { tenantId: true, tenant: { select: { name: true } } },
        };
      } else {
        (select as Record<string, unknown>).tenantId = true;
        (select as Record<string, unknown>).tenant = {
          select: { name: true },
        };
      }

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

        let tenantId = "";
        let tenantName = "";
        if (config.tenantScope === "category") {
          const cat = row.category as
            | { tenantId?: string; tenant?: { name: string } }
            | undefined;
          tenantId = cat?.tenantId ?? "";
          tenantName = cat?.tenant?.name ?? "";
        } else {
          tenantId = (row.tenantId as string) ?? "";
          const t = row.tenant as { name?: string } | undefined;
          tenantName = t?.name ?? "";
        }

        allItems.push({
          entityType: config.type,
          id: row.id,
          name,
          deletedAt: row.deletedAt?.toISOString() ?? "",
          deletedBy: (row.deletedBy as string) ?? null,
          deleteReason: (row.deleteReason as string) ?? null,
          tenantId,
          tenantName,
        });
      }
    }

    allItems.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
    return allItems;
  }

  /** Restore a trashed item (set deletedAt to null). Platform scope — no tenant filter. */
  async restore(id: string, config: TrashEntityConfig): Promise<boolean> {
    const delegate = getDelegate(config.model);
    if (!delegate) return false;

    const where: Record<string, unknown> = {
      id,
      deletedAt: { not: null },
    };

    const existing = await delegate.findFirst({ where });
    if (!existing) return false;

    await delegate.update({
      where: { id },
      data: { deletedAt: null },
    });
    return true;
  }

  /** Permanently delete a trashed item. Platform scope — no tenant filter. */
  async permanentlyDelete(
    id: string,
    config: TrashEntityConfig,
  ): Promise<boolean> {
    const delegate = getDelegate(config.model);
    if (!delegate) return false;

    const where: Record<string, unknown> = {
      id,
      deletedAt: { not: null },
    };

    const existing = await delegate.findFirst({ where });
    if (!existing) return false;

    await delegate.delete({ where: { id } });
    return true;
  }
}

const trashRepository = new TrashRepository();
export default trashRepository;
