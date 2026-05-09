import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TestimonialsBlock({ props }) {
  const items =
    props.items && props.items.length > 0
      ? props.items
      : [
          { quote: "Great product!", author: "Customer 1" },
          { quote: "Highly recommended!", author: "Customer 2" },
          { quote: "Best experience!", author: "Customer 3" },
        ];
  const cols = props.columns ?? 3;
  return _jsxs("div", {
    style: { marginBlock: "1rem" },
    children: [
      _jsx("h2", {
        style: {
          fontSize: "2rem",
          fontWeight: 600,
          textAlign: "center",
          marginBottom: "2rem",
        },
        children: props.heading || "What Our Customers Say",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "1rem",
        },
        children: items.map((t, i) =>
          _jsxs(
            "div",
            {
              style: {
                padding: "1rem",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
              },
              children: [
                _jsx("p", {
                  style: { margin: 0, marginBottom: "1rem", color: "#666" },
                  children: `"${t.quote}"`,
                }),
                _jsxs("p", {
                  style: {
                    margin: 0,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  },
                  children: [
                    "\u2014 ",
                    t.author,
                    t.role
                      ? _jsxs("span", {
                          style: { color: "#999", fontWeight: 400 },
                          children: [" ", "\u00B7 ", t.role],
                        })
                      : null,
                  ],
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
