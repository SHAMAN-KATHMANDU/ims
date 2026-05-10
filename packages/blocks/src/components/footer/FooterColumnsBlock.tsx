import type { FooterColumnsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

type FooterColumn = NonNullable<FooterColumnsProps["columns"]>[number];

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help", href: "/help" },
      { label: "Contact", href: "/contact" },
      { label: "FAQs", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export function FooterColumnsBlock({
  props,
}: BlockComponentProps<FooterColumnsProps>) {
  const columns = props.columns?.length ? props.columns : DEFAULT_COLUMNS;

  return (
    <footer
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: "2rem",
        padding: "2rem 1rem",
        backgroundColor: "#1a1a2e",
        color: "#fff",
      }}
    >
      {columns.map((col, i) => (
        <div key={i}>
          <h4
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            {col.title}
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(col.links || []).map((link, j) => (
              <li key={j} style={{ marginBottom: "0.5rem" }}>
                <a
                  href={link.href}
                  style={{
                    color: "#bbb",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </footer>
  );
}
