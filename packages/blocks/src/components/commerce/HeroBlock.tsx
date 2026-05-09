import type { HeroProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { normalizeImageRef } from "../../utils/image";

export function HeroBlock({ props }: BlockComponentProps<HeroProps>) {
  const backgroundImage = props.imageUrl
    ? normalizeImageRef(props.imageUrl)
    : undefined;

  return (
    <section
      style={{
        position: "relative",
        height: "400px",
        background: backgroundImage
          ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${backgroundImage}) center / cover`
          : "linear-gradient(135deg, #4a90e2 0%, #f0ebe3 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
        marginBlock: "1rem",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          {props.title || "Hero Title"}
        </h2>
        {props.subtitle && (
          <p style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
            {props.subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
