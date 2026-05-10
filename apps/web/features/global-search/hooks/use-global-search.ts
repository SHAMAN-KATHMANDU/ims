"use client";

/**
 * useGlobalSearch — single TanStack Query that fans out across content
 * entities (tenant pages, blog posts, products, snippets) and returns
 * a flat ranked result list for the cmd-K palette.
 *
 * Design choices:
 *   - One query, one cache key. Easier to reason about than four
 *     parallel hooks fanning loading states into the palette.
 *   - Bounded to 5 hits per kind so the dropdown stays small.
 *   - Disabled when `query.length < 2` — empty/short queries hit nothing
 *     and the palette falls back to its existing nav-based listing.
 *   - Tenant-pages list endpoint doesn't accept `search`; we client-side
 *     filter the first 50 pages by title/slug. Acceptable because
 *     most tenants have <50 pages.
 */

import { useQuery } from "@tanstack/react-query";
import { listBlogPosts } from "@/features/tenant-blog";
import { listTenantPages } from "@/features/tenant-pages";
import { listSnippets } from "@/features/snippets";
import { getProducts } from "@/features/products";

export type GlobalSearchKind = "page" | "post" | "product" | "snippet";

export interface GlobalSearchResult {
  kind: GlobalSearchKind;
  /** Stable id for React keys + dedup. */
  id: string;
  /** Primary display label. */
  label: string;
  /** Optional secondary line (e.g. slug, sku). */
  sub?: string;
  /** Workspace-relative href the palette navigates to on select. */
  href: (workspace: string) => string;
}

const PER_KIND_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

interface FetchArgs {
  query: string;
  /** Caller flags: skip an entity type the tenant doesn't have. */
  includeProducts?: boolean;
}

async function fetchPages(query: string): Promise<GlobalSearchResult[]> {
  try {
    const result = await listTenantPages({ limit: 50 });
    const q = query.toLowerCase();
    return (result.pages ?? [])
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      )
      .slice(0, PER_KIND_LIMIT)
      .map((p) => ({
        kind: "page" as const,
        id: p.id,
        label: p.title,
        sub: `/${p.slug}`,
        href: (ws) => `/${ws}/site/pages/${p.id}`,
      }));
  } catch {
    return [];
  }
}

async function fetchPosts(query: string): Promise<GlobalSearchResult[]> {
  try {
    const result = await listBlogPosts({
      search: query,
      limit: PER_KIND_LIMIT,
    });
    return (result.posts ?? []).map((p) => ({
      kind: "post" as const,
      id: p.id,
      label: p.title,
      sub: `/${p.slug}`,
      href: (ws) => `/${ws}/site/blog/${p.id}`,
    }));
  } catch {
    return [];
  }
}

async function fetchProducts(query: string): Promise<GlobalSearchResult[]> {
  try {
    const result = await getProducts({ search: query, limit: PER_KIND_LIMIT });
    // PaginatedProductsResponse uses `data` (not `products`).
    const items = result.data ?? [];
    return items.slice(0, PER_KIND_LIMIT).map((p) => ({
      kind: "product" as const,
      id: p.id,
      label: p.name,
      sub: p.imsCode || undefined,
      href: (ws: string) => `/${ws}/products/${p.id}`,
    }));
  } catch {
    return [];
  }
}

async function fetchSnippets(query: string): Promise<GlobalSearchResult[]> {
  try {
    const result = await listSnippets({
      search: query,
      limit: PER_KIND_LIMIT,
    });
    return (result.snippets ?? []).map((s) => ({
      kind: "snippet" as const,
      id: s.id,
      label: s.title,
      sub: `/${s.slug}`,
      href: (ws) => `/${ws}/site/snippets/${s.id}`,
    }));
  } catch {
    return [];
  }
}

async function fetchAll(args: FetchArgs): Promise<GlobalSearchResult[]> {
  const tasks: Promise<GlobalSearchResult[]>[] = [
    fetchPages(args.query),
    fetchPosts(args.query),
    fetchSnippets(args.query),
  ];
  if (args.includeProducts !== false) {
    tasks.push(fetchProducts(args.query));
  }
  const groups = await Promise.all(tasks);
  return groups.flat();
}

export interface UseGlobalSearchOptions {
  enabled?: boolean;
  includeProducts?: boolean;
}

export function useGlobalSearch(
  query: string,
  options?: UseGlobalSearchOptions,
) {
  const trimmed = query.trim();
  const longEnough = trimmed.length >= MIN_QUERY_LENGTH;
  return useQuery({
    queryKey: [
      "global-search",
      trimmed,
      options?.includeProducts ?? true,
    ] as const,
    queryFn: () =>
      fetchAll({
        query: trimmed,
        includeProducts: options?.includeProducts,
      }),
    enabled: (options?.enabled ?? true) && longEnough,
    staleTime: 30_000, // results stay warm for 30s
    placeholderData: (prev) => prev,
  });
}
