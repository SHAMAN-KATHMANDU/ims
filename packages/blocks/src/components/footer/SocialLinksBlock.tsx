import type { SocialLinksProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function SocialLinksBlock({
  props,
}: BlockComponentProps<SocialLinksProps>) {
  const items = props.items || [
    { platform: "facebook", href: "#" },
    { platform: "twitter", href: "#" },
    { platform: "instagram", href: "#" },
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
      }}
    >
      {items.map((item, i) => (
        <a
          key={i}
          href={item.href}
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#ddd",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            color: "#666",
          }}
        >
          {item.platform?.[0]?.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
