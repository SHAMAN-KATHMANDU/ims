import type { BlogListProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function BlogListBlock({
  props,
  dataContext,
}: BlockComponentProps<BlogListProps>) {
  const posts = dataContext.blogPosts || [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      <h2 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "2rem" }}>
        {props.heading || "Blog Posts"}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        {posts.length === 0 ? (
          <div
            style={{
              color: "#999",
              fontSize: "0.875rem",
              gridColumn: "1 / -1",
            }}
          >
            No blog posts
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  aspectRatio: "16 / 9",
                  backgroundColor: "#f0f0f0",
                }}
              />
              <div style={{ padding: "1rem" }}>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {post.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
                  {post.excerpt || "Read more..."}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
