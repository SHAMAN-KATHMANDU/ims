/**
 * Blog blocks — simple list of featured posts. Consumes the already-fetched
 * `featuredBlogPosts` on the data context.
 */

import Link from "next/link";
import type { BlogListProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

export function BlogListBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<BlogListProps>) {
  const posts = dataContext.featuredBlogPosts.slice(0, props.limit);
  if (posts.length === 0) return null;
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "2.5rem",
              textAlign: "center",
            }}
          >
            {props.heading}
          </h2>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
            gap: "1.75rem",
          }}
        >
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              style={{
                display: "block",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
                overflow: "hidden",
                color: "var(--color-text)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "var(--color-surface)",
                  position: "relative",
                }}
              >
                {post.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.heroImageUrl}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "1.1rem 1.25rem 1.25rem" }}>
                {post.category && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--color-muted)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {post.category.name}
                  </div>
                )}
                <h3
                  style={{
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    lineHeight: 1.3,
                    margin: "0 0 0.4rem",
                  }}
                >
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p
                    style={{
                      fontSize: "0.88rem",
                      color: "var(--color-muted)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {post.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
