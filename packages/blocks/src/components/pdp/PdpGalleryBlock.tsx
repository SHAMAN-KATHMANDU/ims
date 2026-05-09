import type { PdpGalleryProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PdpGalleryBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpGalleryProps>) {
  const product =
    dataContext.activeProduct ?? dataContext.products?.[0] ?? null;
  const images: string[] = product?.images?.length
    ? product.images
    : product?.image
      ? [product.image as string]
      : [];

  const aspectRatio = props.aspectRatio ?? "1/1";
  const isLeftThumbs = props.layout === "thumbs-left";
  const isStacked = props.layout === "stacked";

  if (isStacked) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBlock: "1rem",
        }}
      >
        {(images.length > 0 ? images : [null, null, null]).map((src, i) => (
          <div
            key={i}
            style={{
              aspectRatio,
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
              backgroundImage: src ? `url(${src})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
      </div>
    );
  }

  const main = images[0] ?? null;
  const thumbs = images.length > 1 ? images.slice(1) : [null, null, null, null];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isLeftThumbs ? "1fr 4fr" : undefined,
        gridTemplateRows: isLeftThumbs ? undefined : "auto auto",
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      <div
        style={{
          aspectRatio,
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          backgroundImage: main ? `url(${main})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          gridRow: isLeftThumbs ? undefined : 1,
          order: isLeftThumbs ? 2 : 0,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: isLeftThumbs ? "column" : "row",
          gap: "0.5rem",
          order: isLeftThumbs ? 1 : 1,
        }}
      >
        {thumbs.map((src, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              width: isLeftThumbs ? "100%" : "80px",
              backgroundColor: "#f0f0f0",
              borderRadius: "4px",
              cursor: props.enableZoom ? "zoom-in" : "pointer",
              backgroundImage: src ? `url(${src})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
      </div>
    </div>
  );
}
