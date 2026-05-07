"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface FormField {
  kind: "text" | "email" | "textarea" | "phone" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  width?: "full" | "half";
}

const FormFieldSchema = z.object({
  kind: z.enum(["text", "email", "textarea", "phone", "select"]),
  label: z.string().max(100),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(100)).optional(),
  width: z.enum(["full", "half"]).optional(),
});

interface FormFieldsBuilderProps {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
  label?: string;
}

export function FormFieldsBuilder({
  value,
  onChange,
  label = "Form Fields",
}: FormFieldsBuilderProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <ArrayBuilder
        value={value}
        onChange={onChange}
        renderRow={(item, index) => (
          <AutoForm
            schema={FormFieldSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="form"
          />
        )}
        renderCollapsedTitle={(item) => `${item.kind}: ${item.label}`}
        addLabel="Add field"
        blockKind="form"
      />
    </div>
  );
}
