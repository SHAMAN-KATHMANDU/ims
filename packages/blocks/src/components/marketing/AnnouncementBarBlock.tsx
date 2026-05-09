import type { AnnouncementBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function AnnouncementBarBlock({
  props,
}: BlockComponentProps<AnnouncementBarProps>) {
  const toneStyles = {
    default: { backgroundColor: "#4a90e2", color: "#fff" },
    muted: { backgroundColor: "#f0f0f0", color: "#666" },
    accent: { backgroundColor: "#f0ebe3", color: "#1a1a2e" },
  };

  const style = toneStyles[props.tone ?? "default"];

  return (
    <div
      style={{
        padding: "1rem",
        ...style,
        textAlign: "center",
        fontSize: "0.875rem",
      }}
    >
      {props.text || "Announcement"}
    </div>
  );
}
