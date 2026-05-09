import type { GalleryProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { normalizeImageRef } from "../../utils/image";

export function GalleryBlock({ props }: BlockComponentProps<GalleryProps>) {
  const images = props.images ?? [];
  const columns = props.columns ?? 3;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {images.length === 0 ? (
        <div style={{ color: "#999", fontSize: "0.875rem" }}>
          Gallery (no images)
        </div>
      ) : (
        images.map((img, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          />
        ))
      )}
    </div>
  );
}
