import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function EmbedBlock({ props }) {
    return (_jsx("div", { style: {
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            overflow: "hidden",
            borderRadius: "8px",
            marginBlock: "1rem",
        }, children: _jsxs("div", { style: {
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
            }, children: ["Embed: ", props.src || "iframe"] }) }));
}
