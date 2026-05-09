import type { MarkdownBodyProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function MarkdownBodyBlock({
  props,
}: BlockComponentProps<MarkdownBodyProps>) {
  return (
    <div
      style={{
        fontSize: "1rem",
        lineHeight: 1.7,
        color: "#333",
      }}
    >
      <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {props.source || "Markdown content here"}
      </pre>
    </div>
  );
}
