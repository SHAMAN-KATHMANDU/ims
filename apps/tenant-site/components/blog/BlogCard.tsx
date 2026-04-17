import Link from "next/link";
import type { PublicBlogPostListItem } from "@/lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function BlogCard({
  post,
  featured = false,
}: {
  post: PublicBlogPostListItem;
  featured?: boolean;
}) {
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: featured ? "2rem" : "1.5rem",
      }}
    >
      {post.heroImageUrl && (
        <Link href={`/blog/${post.slug}`} aria-label={post.title} tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.heroImageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{
              width: "100%",
              aspectRatio: featured ? "16/9" : "4/3",
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
        </Link>
      )}
      {post.category && (
        <Link
          href={`/blog/category/${post.category.slug}`}
          style={{
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: "0.05em",
            color: "var(--color-muted)",
          }}
        >
          {post.category.name}
        </Link>
      )}
      <h3
        style={{
          fontSize: featured ? "1.75rem" : "1.25rem",
          fontWeight: 600,
          lineHeight: 1.25,
          margin: 0,
        }}
      >
        <Link
          href={`/blog/${post.slug}`}
          style={{
            color: "inherit",
            textDecoration: "none",
          }}
        >
          {post.title}
        </Link>
      </h3>
      {post.excerpt && (
        <p
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.55,
            color: "var(--color-muted)",
            margin: 0,
          }}
        >
          {post.excerpt}
        </p>
      )}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "var(--color-muted)",
        }}
      >
        {post.authorName && <span>{post.authorName}</span>}
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
    </article>
  );
}
