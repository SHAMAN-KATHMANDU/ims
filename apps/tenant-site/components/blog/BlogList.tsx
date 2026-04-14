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
        <p style={{ color: "rgba(0,0,0,0.6)" }}>
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <Link
            href="/blog"
            data-active={!activeCategorySlug}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 999,
              fontSize: "0.8rem",
              background: !activeCategorySlug
                ? "rgba(0,0,0,0.85)"
                : "rgba(128,128,128,0.1)",
              color: !activeCategorySlug ? "white" : "inherit",
              textDecoration: "none",
            }}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/blog/category/${c.slug}`}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: 999,
                fontSize: "0.8rem",
                background:
                  activeCategorySlug === c.slug
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(128,128,128,0.1)",
                color: activeCategorySlug === c.slug ? "white" : "inherit",
                textDecoration: "none",
              }}
            >
              {c.name} ({c.postCount})
            </Link>
          ))}
        </div>
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
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.75rem",
            marginTop: "3rem",
          }}
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
            const href = p === 1 ? basePath : `${basePath}?page=${p}`;
            return (
              <Link
                key={p}
                href={href}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: 4,
                  border: "1px solid rgba(128,128,128,0.25)",
                  background: p === page ? "rgba(0,0,0,0.85)" : "transparent",
                  color: p === page ? "white" : "inherit",
                  textDecoration: "none",
                  fontSize: "0.85rem",
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
