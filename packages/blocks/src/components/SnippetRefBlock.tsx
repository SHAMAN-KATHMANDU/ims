import type { SnippetRefProps } from "@repo/shared";
import type { BlockComponentProps } from "../types";

export function SnippetRefBlock({
  props,
}: BlockComponentProps<SnippetRefProps>) {
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#f0f0f0",
        borderRadius: "4px",
        border: "2px dashed #ccc",
        color: "#999",
        fontSize: "0.875rem",
        textAlign: "center",
        marginBlock: "1rem",
      }}
    >
      Snippet Ref: {props.snippetId || "not set"}
    </div>
  );
}
