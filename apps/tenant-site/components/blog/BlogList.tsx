import Link from "next/link";
import type {
  PublicBlogCategoryWithCount,
  PublicBlogPostListItem,
} from "@/lib/api";
import { BlogCard } from "./BlogCard";

export function BlogList({
  posts,
  categories,
  activeCategorySlug,
  total,
  page,
  limit,
  basePath = "/blog",
}: {
  posts: PublicBlogPostListItem[];
  categories: PublicBlogCategoryWithCount[];
  activeCategorySlug?: string;
  total: number;
  page: number;
  limit: number;
  basePath?: string;
}) {
  if (posts.length === 0) {
    return (
      <div style={{ padding: "4rem 0", textAlign: "center" }}>
        <p style={{ color: "var(--color-muted)" }}>
          No posts published yet. Check back soon.
        </p>
      </div>
    );
  }

  const [featured, ...rest] = posts;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {categories.length > 0 && (
        <nav
          aria-label="Blog categories"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <Link
            href="/blog"
            aria-current={!activeCategorySlug ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.5rem 1rem",
              minHeight: 44,
              borderRadius: 999,
              fontSize: "0.85rem",
              background: !activeCategorySlug
                ? "var(--color-text)"
                : "var(--color-surface)",
              color: !activeCategorySlug
                ? "var(--color-background)"
                : "inherit",
              textDecoration: "none",
            }}
          >
            All
          </Link>
          {categories.map((c) => {
            const isActive = activeCategorySlug === c.slug;
            return (
              <Link
                key={c.id}
                href={`/blog/category/${c.slug}`}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1rem",
                  minHeight: 44,
                  borderRadius: 999,
                  fontSize: "0.85rem",
                  background: isActive
                    ? "var(--color-text)"
                    : "var(--color-surface)",
                  color: isActive ? "var(--color-background)" : "inherit",
                  textDecoration: "none",
                }}
              >
                {c.name} ({c.postCount})
              </Link>
            );
          })}
        </nav>
      )}

      {featured && (
        <div style={{ marginBottom: "3rem" }}>
          <BlogCard post={featured} featured />
        </div>
      )}

      {rest.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem",
          }}
        >
          {rest.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "3rem",
          }}
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
            const href = p === 1 ? basePath : `${basePath}?page=${p}`;
            const isActive = p === page;
            return (
              <Link
                key={p}
                href={href}
                aria-label={`Go to page ${p}`}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
                  padding: "0 0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--color-border)",
                  background: isActive ? "var(--color-text)" : "transparent",
                  color: isActive ? "var(--color-background)" : "inherit",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
