import type { EmbedProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function EmbedBlock({ props }: BlockComponentProps<EmbedProps>) {
  return (
    <div
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        height: 0,
        overflow: "hidden",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.875rem",
          color: "#666",
        }}
      >
        Embed: {props.src || "iframe"}
      </div>
    </div>
  );
}
