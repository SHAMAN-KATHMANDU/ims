"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface BentoCell {
  image?: string;
  productId?: string;
  featured?: boolean;
}

const BentoCellSchema = z.object({
  image: z.string().optional(),
  productId: z.string().max(80).optional(),
  featured: z.boolean().optional(),
});

interface BentoCellsBuilderProps {
  value: BentoCell[];
  onChange: (cells: BentoCell[]) => void;
  label?: string;
}

export function BentoCellsBuilder({
  value,
  onChange,
  label = "Bento Cells",
}: BentoCellsBuilderProps) {
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
            schema={BentoCellSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="bento-showcase"
          />
        )}
        renderCollapsedTitle={(item) =>
          item.featured ? "⭐ Featured" : "Cell"
        }
        addLabel="Add cell"
        blockKind="bento-cells"
      />
    </div>
  );
}
