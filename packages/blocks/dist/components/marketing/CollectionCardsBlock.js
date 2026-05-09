import { jsx as _jsx } from "react/jsx-runtime";
export function CollectionCardsBlock({ props }) {
  const cards = props.cards ?? [];
  return _jsx("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "1rem",
      marginBlock: "1rem",
    },
    children:
      cards.length === 0
        ? _jsx("div", {
            style: {
              color: "#999",
              fontSize: "0.875rem",
              gridColumn: "1 / -1",
            },
            children: "Collection Cards",
          })
        : cards.map((card, i) =>
            _jsx(
              "div",
              {
                style: {
                  aspectRatio: "1",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: 500,
                },
                children: card.title || "Collection",
              },
              i,
            ),
          ),
  });
}
