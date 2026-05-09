import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function VideoBlock({ props }) {
  const aspectRatio = props.aspectRatio ?? "16 / 9";
  return _jsx("div", {
    style: {
      position: "relative",
      width: "100%",
      paddingBottom: "56.25%",
      marginBlock: "1rem",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "#000",
    },
    children: _jsxs("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "0.875rem",
      },
      children: ["Video (", props.source, "): ", props.url || "Not set"],
    }),
  });
}
