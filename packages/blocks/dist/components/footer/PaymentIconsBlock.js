import { jsx as _jsx } from "react/jsx-runtime";
export function PaymentIconsBlock({ props }) {
  const items = props.items || [
    { name: "visa" },
    { name: "mastercard" },
    { name: "paypal" },
    { name: "upi" },
  ];
  return _jsx("div", {
    style: {
      display: "flex",
      gap: "1rem",
      justifyContent:
        props.align === "center"
          ? "center"
          : props.align === "end"
            ? "flex-end"
            : "flex-start",
      padding: "1rem",
      backgroundColor: "#f9f9f9",
    },
    children: items.map((item, i) =>
      _jsx(
        "div",
        {
          style: {
            width: "50px",
            height: "30px",
            backgroundColor: "#ddd",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            color: "#666",
          },
          children: item.name,
        },
        i,
      ),
    ),
  });
}
