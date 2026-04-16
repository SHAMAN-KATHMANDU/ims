import Link from "next/link";
import type { PublicBlogPostListItem } from "@/lib/api";

/**
 * Homepage "From the journal" section — rendered by every template layout.
 * Only shows if there are published posts; otherwise nothing is rendered
 * so templates don't need per-template empty-state handling.
 */
export function FeaturedBlogSection({
  posts,
}: {
  posts: PublicBlogPostListItem[];
}) {
  if (posts.length === 0) return null;

  return (
    <section style={{ padding: "3rem 0 4rem" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>From the journal</h2>
          <Link
            href="/blog"
            style={{
              fontSize: "0.85rem",
              color: "var(--color-muted)",
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem",
          }}
        >
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {p.heroImageUrl && (
                <img
                  src={p.heroImageUrl}
                  alt={p.title}
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              )}
              {p.category && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "rgba(0,0,0,0.55)",
                  }}
                >
                  {p.category.name}
                </span>
              )}
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {p.title}
              </h3>
              {p.excerpt && (
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "rgba(0,0,0,0.65)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {p.excerpt.length > 140
                    ? `${p.excerpt.slice(0, 140).trim()}…`
                    : p.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
