"use client";

/**
 * useGlobalSearch — single TanStack Query that fans out across content
 * entities (tenant pages, blog posts, products, snippets) and returns
 * a flat ranked result list for the cmd-K palette.
 *
 * Each source loader is dynamically imported so the four downstream
 * features (tenant-pages, tenant-blog, products, snippets) only enter
 * the bundle graph when the user actually types in the palette.
 */

import { useQuery } from "@tanstack/react-query";

export type GlobalSearchKind = "page" | "post" | "product" | "snippet";

export interface GlobalSearchResult {
  kind: GlobalSearchKind;
  id: string;
  label: string;
  sub?: string;
  href: (workspace: string) => string;
}

const PER_KIND_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

async function fetchPages(query: string): Promise<GlobalSearchResult[]> {
  try {
    const { listTenantPages } = await import("@/features/tenant-pages");
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
    const { listBlogPosts } = await import("@/features/tenant-blog");
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
    const { getProducts } = await import("@/features/products");
    const result = await getProducts({ search: query, limit: PER_KIND_LIMIT });
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
    const { listSnippets } = await import("@/features/snippets");
    const result = await listSnippets({ search: query, limit: PER_KIND_LIMIT });
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

interface FetchArgs {
  query: string;
  includeProducts?: boolean;
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
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
