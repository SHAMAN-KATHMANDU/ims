import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AccordionBlock({ props }) {
  const items = props.items ?? [];
  return _jsx("div", {
    style: { marginBlock: "1rem" },
    children:
      items.length === 0
        ? _jsx("div", {
            style: { color: "#999", fontSize: "0.875rem" },
            children: "Accordion (no items configured)",
          })
        : items.map((item, i) =>
            _jsxs(
              "div",
              {
                style: {
                  borderTop: "1px solid #ddd",
                  paddingBlock: "1rem",
                },
                children: [
                  _jsx("button", {
                    style: {
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 500,
                      width: "100%",
                      textAlign: "left",
                      padding: 0,
                    },
                    children: item.title || "Item",
                  }),
                  _jsx("div", {
                    style: {
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#666",
                    },
                    children: item.body || "Content",
                  }),
                ],
              },
              i,
            ),
          ),
  });
}
