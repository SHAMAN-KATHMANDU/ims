"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface UtilityBarItem {
  label: string;
  href: string;
}

const UtilityBarItemSchema = z.object({
  label: z.string().max(100),
  href: z.string().max(500),
});

interface UtilityBarBuilderProps {
  value: UtilityBarItem[];
  onChange: (items: UtilityBarItem[]) => void;
  label?: string;
}

export function UtilityBarBuilder({
  value,
  onChange,
  label = "Utility bar links",
}: UtilityBarBuilderProps) {
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
            schema={UtilityBarItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="utility-bar"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Link"}
        addLabel="Add link"
        blockKind="utility-bar"
      />
    </div>
  );
}
