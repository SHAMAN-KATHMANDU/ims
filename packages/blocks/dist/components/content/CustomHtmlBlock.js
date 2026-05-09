import { jsx as _jsx } from "react/jsx-runtime";
export function CustomHtmlBlock({ props, }) {
    return (_jsx("div", { style: {
            marginBlock: "1rem",
            padding: "1rem",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            fontSize: "0.875rem",
            color: "#666",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
        }, children: props.html || "&lt;html&gt;" }));
}
