import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FormBlock({ props }) {
  const fields = props.fields ?? [];
  return _jsxs("form", {
    style: {
      maxWidth: "600px",
      margin: "1rem auto",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    children: [
      fields.length === 0
        ? _jsx("div", {
            style: { color: "#999", fontSize: "0.875rem" },
            children: "Form (no fields configured)",
          })
        : fields.map((field, i) =>
            _jsxs(
              "div",
              {
                children: [
                  _jsxs("label", {
                    style: {
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    },
                    children: [
                      field.label || "Field",
                      field.required &&
                        _jsx("span", {
                          style: { color: "red" },
                          children: "*",
                        }),
                    ],
                  }),
                  _jsx("input", {
                    type: field.kind === "textarea" ? "text" : field.kind,
                    placeholder: field.placeholder,
                    style: {
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "1rem",
                    },
                    disabled: true,
                  }),
                ],
              },
              i,
            ),
          ),
      _jsx("button", {
        type: "submit",
        style: {
          padding: "0.75rem 1.5rem",
          backgroundColor: "#4a90e2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 500,
        },
        disabled: true,
        children: props.submitLabel || "Submit",
      }),
    ],
  });
}
