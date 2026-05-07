"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface SizeGuideRow {
  label: string;
  values: string[];
}

const SizeGuideRowSchema = z.object({
  label: z.string().max(80),
  values: z.array(z.string().max(30)).min(1).max(10),
});

interface SizeGuideMatrixBuilderProps {
  value: SizeGuideRow[];
  columnCount: number;
  onChange: (rows: SizeGuideRow[]) => void;
  label?: string;
}

export function SizeGuideMatrixBuilder({
  value,
  columnCount,
  onChange,
  label = "Size Guide Rows",
}: SizeGuideMatrixBuilderProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <p className="text-xs text-gray-500 mb-2">
        Each row must have exactly {columnCount} value(s)
      </p>
      <ArrayBuilder
        value={value}
        onChange={onChange}
        renderRow={(item, index) => (
          <AutoForm
            schema={SizeGuideRowSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="size-guide"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Row"}
        addLabel="Add row"
        blockKind="size-guide"
      />
    </div>
  );
}
