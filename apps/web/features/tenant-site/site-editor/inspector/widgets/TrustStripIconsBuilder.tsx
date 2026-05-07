"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface TrustIcon {
  label: string;
  value: string;
}

const TrustIconSchema = z.object({
  label: z.string().max(80),
  value: z.string().max(80),
});

interface TrustStripIconsBuilderProps {
  value: TrustIcon[];
  onChange: (icons: TrustIcon[]) => void;
  label?: string;
}

export function TrustStripIconsBuilder({
  value,
  onChange,
  label = "Trust Strip Icons",
}: TrustStripIconsBuilderProps) {
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
            schema={TrustIconSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="trust-strip"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Icon"}
        addLabel="Add icon"
        blockKind="trust-strip"
      />
    </div>
  );
}
