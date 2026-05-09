import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BlogListBlock({ props, dataContext }) {
  const posts = dataContext.blogPosts || [];
  return _jsxs("div", {
    style: { marginBlock: "1rem" },
    children: [
      _jsx("h2", {
        style: { fontSize: "2rem", fontWeight: 600, marginBottom: "2rem" },
        children: props.heading || "Blog Posts",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        },
        children:
          posts.length === 0
            ? _jsx("div", {
                style: {
                  color: "#999",
                  fontSize: "0.875rem",
                  gridColumn: "1 / -1",
                },
                children: "No blog posts",
              })
            : posts.map((post) =>
                _jsxs(
                  "div",
                  {
                    style: {
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      overflow: "hidden",
                    },
                    children: [
                      _jsx("div", {
                        style: {
                          aspectRatio: "16 / 9",
                          backgroundColor: "#f0f0f0",
                        },
                      }),
                      _jsxs("div", {
                        style: { padding: "1rem" },
                        children: [
                          _jsx("h3", {
                            style: {
                              fontSize: "1rem",
                              fontWeight: 600,
                              marginBottom: "0.5rem",
                            },
                            children: post.title,
                          }),
                          _jsx("p", {
                            style: {
                              fontSize: "0.875rem",
                              color: "#666",
                              margin: 0,
                            },
                            children: post.excerpt || "Read more...",
                          }),
                        ],
                      }),
                    ],
                  },
                  post.id,
                ),
              ),
      }),
    ],
  });
}
