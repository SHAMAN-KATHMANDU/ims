"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface PolicyItem {
  label: string;
  detail?: string;
  icon?: "shipping" | "returns" | "secure" | "support" | "warranty" | "gift";
  href?: string;
}

const PolicyItemSchema = z.object({
  label: z.string().max(80),
  detail: z.string().max(200).optional(),
  icon: z
    .enum(["shipping", "returns", "secure", "support", "warranty", "gift"])
    .optional(),
  href: z.string().max(1000).optional(),
});

interface PolicyStripBuilderProps {
  value: PolicyItem[];
  onChange: (items: PolicyItem[]) => void;
  label?: string;
}

export function PolicyStripBuilder({
  value,
  onChange,
  label = "Policies",
}: PolicyStripBuilderProps) {
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
            schema={PolicyItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="policy-strip"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Policy"}
        addLabel="Add policy"
        blockKind="policy-strip"
      />
    </div>
  );
}
