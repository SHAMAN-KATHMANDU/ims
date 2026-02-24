/**
 * Trash repository - database access for trash module.
 * Uses dynamic Prisma delegates (product, category, etc.) for soft-deleted entities.
 */

import prisma from "@/config/prisma";

type Delegate = {
  findMany: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};
const client = prisma as unknown as Record<string, Delegate | undefined>;

export type TrashWhere = Record<string, unknown>;
export type TrashSelect = Record<string, boolean>;

export const trashRepository = {
  findTrashedItems(model: string, where: TrashWhere, select: TrashSelect) {
    const delegate = client[model];
    if (!delegate?.findMany) return Promise.resolve([]);
    return delegate.findMany({ where, select }) as Promise<
      Array<{ id: string; deletedAt: Date | null; [k: string]: unknown }>
    >;
  },

  findFirstTrashed(model: string, where: TrashWhere) {
    const delegate = client[model];
    if (!delegate?.findFirst) return Promise.resolve(null);
    return delegate.findFirst({ where }) as Promise<{ id: string } | null>;
  },

  restore(model: string, id: string, data: { deletedAt: null }) {
    const delegate = client[model];
    if (!delegate?.update)
      return Promise.reject(new Error("Entity model not found"));
    return delegate.update({ where: { id }, data }) as Promise<unknown>;
  },

  deletePermanently(model: string, id: string) {
    const delegate = client[model];
    if (!delegate?.delete)
      return Promise.reject(new Error("Entity model not found"));
    return delegate.delete({ where: { id } }) as Promise<unknown>;
  },
};
