import { jsx as _jsx } from "react/jsx-runtime";
export function GalleryBlock({ props }) {
    const images = props.images ?? [];
    const columns = props.columns ?? 3;
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "1rem",
            marginBlock: "1rem",
        }, children: images.length === 0 ? (_jsx("div", { style: { color: "#999", fontSize: "0.875rem" }, children: "Gallery (no images)" })) : (images.map((img, i) => (_jsx("div", { style: {
                aspectRatio: "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                overflow: "hidden",
            } }, i)))) }));
}
