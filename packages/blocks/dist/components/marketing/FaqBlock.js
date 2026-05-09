import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FaqBlock({ props }) {
  const items = props.items || [];
  return _jsxs("div", {
    style: {
      maxWidth: "700px",
      margin: "1rem auto",
    },
    children: [
      _jsx("h2", {
        style: { fontSize: "2rem", fontWeight: 600, marginBottom: "1.5rem" },
        children: props.heading || "FAQ",
      }),
      _jsx("div", {
        style: { display: "flex", flexDirection: "column", gap: "1rem" },
        children:
          items.length === 0
            ? [{ q: "Question 1?", a: "Answer 1" }].map((item, i) =>
                _jsxs(
                  "div",
                  {
                    style: {
                      borderBottom: "1px solid #ddd",
                      paddingBottom: "1rem",
                    },
                    children: [
                      _jsx("h4", {
                        style: {
                          margin: 0,
                          marginBottom: "0.5rem",
                          cursor: "pointer",
                        },
                        children: item.q,
                      }),
                      _jsx("p", {
                        style: {
                          margin: 0,
                          color: "#666",
                          fontSize: "0.875rem",
                        },
                        children: item.a,
                      }),
                    ],
                  },
                  i,
                ),
              )
            : items.map((item, i) =>
                _jsxs(
                  "div",
                  {
                    style: {
                      borderBottom: "1px solid #ddd",
                      paddingBottom: "1rem",
                    },
                    children: [
                      _jsx("h4", {
                        style: {
                          margin: 0,
                          marginBottom: "0.5rem",
                          cursor: "pointer",
                        },
                        children: item.question || "Q",
                      }),
                      _jsx("p", {
                        style: {
                          margin: 0,
                          color: "#666",
                          fontSize: "0.875rem",
                        },
                        children: item.answer || "A",
                      }),
                    ],
                  },
                  i,
                ),
              ),
      }),
    ],
  });
}
