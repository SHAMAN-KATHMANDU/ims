import type { CollectionCardsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CollectionCardsBlock({
  props,
}: BlockComponentProps<CollectionCardsProps>) {
  const cards = props.cards ?? [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {cards.length === 0 ? (
        <div
          style={{ color: "#999", fontSize: "0.875rem", gridColumn: "1 / -1" }}
        >
          Collection Cards
        </div>
      ) : (
        cards.map((card, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            {card.title || "Collection"}
          </div>
        ))
      )}
    </div>
  );
}
