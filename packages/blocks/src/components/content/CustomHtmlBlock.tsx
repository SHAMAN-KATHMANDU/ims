import type { CustomHtmlProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CustomHtmlBlock({
  props,
}: BlockComponentProps<CustomHtmlProps>) {
  return (
    <div
      style={{
        marginBlock: "1rem",
        padding: "1rem",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px",
        fontSize: "0.875rem",
        color: "#666",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {props.html || "&lt;html&gt;"}
    </div>
  );
}
