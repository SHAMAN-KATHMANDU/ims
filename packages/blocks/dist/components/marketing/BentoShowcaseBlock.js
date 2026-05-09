import { jsx as _jsx } from "react/jsx-runtime";
export function BentoShowcaseBlock({ props, }) {
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBlock: "1rem",
        }, children: [{ span: 2 }, { span: 1 }, { span: 1 }, { span: 1 }, { span: 1 }].map((item, i) => (_jsx("div", { style: {
                gridColumn: `span ${item.span}`,
                aspectRatio: item.span === 2 ? "2" : "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
            } }, i))) }));
}
