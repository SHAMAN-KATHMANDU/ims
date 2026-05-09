import type { LookbookProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function LookbookBlock({ props }: BlockComponentProps<LookbookProps>) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "4 / 3",
        backgroundColor: "#f0f0f0",
        borderRadius: "8px",
        marginBlock: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        color: "#999",
      }}
    >
      Lookbook
    </div>
  );
}
