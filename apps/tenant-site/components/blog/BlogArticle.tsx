import Link from "next/link";
import type { PublicBlogPost, PublicBlogPostListItem } from "@/lib/api";
import { MarkdownBody } from "./MarkdownBody";
import { BlogCard } from "./BlogCard";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function BlogArticle({
  post,
  related,
}: {
  post: PublicBlogPost;
  related: PublicBlogPostListItem[];
}) {
  return (
    <article
      style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}
    >
      <nav style={{ marginBottom: "2rem" }}>
        <Link
          href="/blog"
          style={{
            fontSize: "0.85rem",
            color: "rgba(0,0,0,0.55)",
            textDecoration: "none",
          }}
        >
          ← Back to all posts
        </Link>
      </nav>

      {post.category && (
        <Link
          href={`/blog/category/${post.category.slug}`}
          style={{
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            color: "rgba(0,0,0,0.55)",
            textDecoration: "none",
          }}
        >
          {post.category.name}
        </Link>
      )}

      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {post.title}
      </h1>

      {post.excerpt && (
        <p
          style={{
            fontSize: "1.15rem",
            lineHeight: 1.5,
            color: "rgba(0,0,0,0.7)",
            marginBottom: "1.5rem",
          }}
        >
          {post.excerpt}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          fontSize: "0.85rem",
          color: "rgba(0,0,0,0.55)",
          borderBottom: "1px solid rgba(128,128,128,0.2)",
          paddingBottom: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {post.authorName && <span>By {post.authorName}</span>}
        {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
        {post.readingMinutes && <span>{post.readingMinutes} min read</span>}
      </div>

      {post.heroImageUrl && (
        <img
          src={post.heroImageUrl}
          alt={post.title}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 4,
            marginBottom: "2rem",
          }}
        />
      )}

      <MarkdownBody source={post.bodyMarkdown} />

      {post.tags.length > 0 && (
        <footer style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${encodeURIComponent(t)}`}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 999,
                  background: "rgba(128,128,128,0.1)",
                  fontSize: "0.75rem",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                #{t}
              </Link>
            ))}
          </div>
        </footer>
      )}

      {related.length > 0 && (
        <section
          style={{
            marginTop: "4rem",
            paddingTop: "2.5rem",
            borderTop: "1px solid rgba(128,128,128,0.2)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
            More reading
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "2rem",
            }}
          >
            {related.map((r) => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
