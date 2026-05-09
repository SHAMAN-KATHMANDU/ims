import type { FormBlockProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function FormBlock({ props }: BlockComponentProps<FormBlockProps>) {
  const fields = props.fields ?? [];

  return (
    <form
      style={{
        maxWidth: "600px",
        margin: "1rem auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {fields.length === 0 ? (
        <div style={{ color: "#999", fontSize: "0.875rem" }}>
          Form (no fields configured)
        </div>
      ) : (
        fields.map((field, i) => (
          <div key={i}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              {field.label || "Field"}
              {field.required && <span style={{ color: "red" }}>*</span>}
            </label>
            <input
              type={field.kind === "textarea" ? "text" : field.kind}
              placeholder={field.placeholder}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
              disabled
            />
          </div>
        ))
      )}
      <button
        type="submit"
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#4a90e2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 500,
        }}
        disabled
      >
        {props.submitLabel || "Submit"}
      </button>
    </form>
  );
}
