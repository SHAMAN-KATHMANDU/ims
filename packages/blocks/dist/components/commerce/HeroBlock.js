import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { normalizeImageRef } from "../../utils/image";
export function HeroBlock({ props }) {
  const backgroundImage = props.imageUrl
    ? normalizeImageRef(props.imageUrl)
    : undefined;
  return _jsx("section", {
    style: {
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
    },
    children: _jsxs("div", {
      children: [
        _jsx("h2", {
          style: {
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "1rem",
          },
          children: props.title || "Hero Title",
        }),
        props.subtitle &&
          _jsx("p", {
            style: { fontSize: "1.25rem", marginBottom: "1.5rem" },
            children: props.subtitle,
          }),
      ],
    }),
  });
}
