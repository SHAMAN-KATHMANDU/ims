import type { PaymentIconsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PaymentIconsBlock({
  props,
}: BlockComponentProps<PaymentIconsProps>) {
  const items = props.items || [
    { name: "visa" },
    { name: "mastercard" },
    { name: "paypal" },
    { name: "upi" },
  ];

  return (
    <div
      style={{
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
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            width: "50px",
            height: "30px",
            backgroundColor: "#ddd",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            color: "#666",
          }}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}
