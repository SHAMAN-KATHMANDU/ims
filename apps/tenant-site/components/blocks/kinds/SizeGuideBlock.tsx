/**
 * size-guide block — measurement table with optional modal trigger.
 *
 * Inline variant drops the table straight into the page. Modal variant
 * hides it behind a button that opens a native <dialog>, which avoids
 * focus-trap + scroll-lock plumbing — browsers handle it. No JS on the
 * inline path; modal uses a small client wrapper so the dialog element
 * can be imperatively opened.
 */

import type { SizeGuideProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { SizeGuideModal } from "./SizeGuideModal";

export function SizeGuideBlock({
  node,
  props,
}: BlockComponentProps<SizeGuideProps>) {
  const variant = props.variant ?? "inline";
  const wrapperHasPadY = node.style?.paddingY !== undefined;

  const table = (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.92rem",
          minWidth: 360,
        }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                textAlign: "left",
                padding: "0.7rem 1rem",
                borderBottom: "1px solid var(--color-border)",
                fontWeight: 600,
                color: "var(--color-muted)",
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Measurement
            </th>
            {props.columns.map((col) => (
              <th
                key={col}
                scope="col"
                style={{
                  padding: "0.7rem 1rem",
                  borderBottom: "1px solid var(--color-border)",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                style={{
                  padding: "0.6rem 1rem",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                  fontWeight: 500,
                  color: "var(--color-text)",
                }}
              >
                {row.label}
              </th>
              {props.columns.map((_, i) => (
                <td
                  key={i}
                  style={{
                    padding: "0.6rem 1rem",
                    borderBottom: "1px solid var(--color-border)",
                    textAlign: "center",
                    color: "var(--color-text)",
                    opacity: 0.85,
                  }}
                >
                  {row.values[i] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const body = (
    <>
      {props.heading && (
        <h2
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.5rem",
          }}
        >
          {props.heading}
        </h2>
      )}
      {props.description && (
        <p
          style={{
            color: "var(--color-muted)",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          {props.description}
        </p>
      )}
      {table}
      {props.note && (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.82rem",
            color: "var(--color-muted)",
            lineHeight: 1.55,
          }}
        >
          {props.note}
        </p>
      )}
    </>
  );

  if (variant === "modal") {
    return (
      <SizeGuideModal triggerLabel={props.triggerLabel ?? "View size guide"}>
        {body}
      </SizeGuideModal>
    );
  }

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container" style={{ maxWidth: 820 }}>
        {body}
      </div>
    </section>
  );
}
