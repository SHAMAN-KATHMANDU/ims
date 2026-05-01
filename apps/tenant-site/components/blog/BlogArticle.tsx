import Link from "next/link";
import { format } from "date-fns";
import type { PublicBlogPost, PublicBlogPostListItem } from "@/lib/api";
import { MarkdownBody } from "./MarkdownBody";
import { BlogCard } from "./BlogCard";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "MMMM d, yyyy");
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
      <nav aria-label="Blog navigation" style={{ marginBottom: "2rem" }}>
        <Link
          href="/blog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            fontSize: "0.85rem",
            color: "var(--color-muted)",
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
            color: "var(--color-muted)",
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
            color: "var(--color-muted)",
            marginBottom: "1.5rem",
          }}
        >
          {post.excerpt}
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.25rem",
          fontSize: "0.85rem",
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {post.authorName && <span>By {post.authorName}</span>}
        {post.publishedAt && (
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
        )}
        {post.readingMinutes && (
          <span aria-label={`${post.readingMinutes} minute read`}>
            {post.readingMinutes} min read
          </span>
        )}
      </div>

      {post.heroImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.heroImageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="(max-width: 768px) 100vw, 720px"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            objectFit: "cover",
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
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 0.85rem",
                  minHeight: 44,
                  borderRadius: 999,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.8rem",
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
          aria-label="Related posts"
          style={{
            marginTop: "4rem",
            paddingTop: "2.5rem",
            borderTop: "1px solid var(--color-border)",
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
