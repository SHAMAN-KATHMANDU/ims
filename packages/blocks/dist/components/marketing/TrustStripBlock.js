import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TrustStripBlock({ props }) {
  const items =
    props.items && props.items.length > 0
      ? props.items
      : [
          { value: "Free Shipping", label: "On orders over $50" },
          { value: "Premium Quality", label: "Hand-checked goods" },
          { value: "Easy Returns", label: "30-day window" },
        ];
  return _jsx("div", {
    style: {
      display: props.layout === "grid" ? "grid" : "flex",
      gridTemplateColumns:
        props.layout === "grid"
          ? `repeat(${props.columns ?? items.length}, 1fr)`
          : undefined,
      justifyContent: "space-around",
      alignItems: "center",
      gap: "1rem",
      padding: "2rem 1rem",
      backgroundColor: props.dark ? "#1a1a1a" : "#f9f9f9",
      color: props.dark ? "#fafafa" : "#1a1a1a",
      borderRadius: "8px",
      marginBlock: "1rem",
    },
    children: items.map((item, i) =>
      _jsxs(
        "div",
        {
          style: { textAlign: "center" },
          children: [
            _jsx("div", {
              style: {
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              },
              children: item.value,
            }),
            _jsx("div", {
              style: { fontSize: "0.875rem", opacity: 0.7 },
              children: item.label,
            }),
          ],
        },
        i,
      ),
    ),
  });
}
