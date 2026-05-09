import { jsx as _jsx } from "react/jsx-runtime";
export function AnnouncementBarBlock({ props }) {
  const toneStyles = {
    default: { backgroundColor: "#4a90e2", color: "#fff" },
    muted: { backgroundColor: "#f0f0f0", color: "#666" },
    accent: { backgroundColor: "#f0ebe3", color: "#1a1a2e" },
  };
  const style = toneStyles[props.tone ?? "default"];
  return _jsx("div", {
    style: {
      padding: "1rem",
      ...style,
      textAlign: "center",
      fontSize: "0.875rem",
    },
    children: props.text || "Announcement",
  });
}
