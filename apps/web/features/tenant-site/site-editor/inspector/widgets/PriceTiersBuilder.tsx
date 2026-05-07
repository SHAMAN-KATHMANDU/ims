"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface PriceTier {
  name: string;
  price: number;
  description?: string;
  features?: string[];
  cta?: string;
  highlight?: boolean;
}

const PriceTierSchema = z.object({
  name: z.string().max(100),
  price: z.number().nonnegative(),
  description: z.string().max(500).optional(),
  features: z.array(z.string().max(200)).optional(),
  cta: z.string().max(60).optional(),
  highlight: z.boolean().optional(),
});

interface PriceTiersBuilderProps {
  value: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  label?: string;
}

export function PriceTiersBuilder({
  value,
  onChange,
  label = "Price Tiers",
}: PriceTiersBuilderProps) {
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
            schema={PriceTierSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="price-tiers"
          />
        )}
        renderCollapsedTitle={(item) => `${item.name} — $${item.price}`}
        addLabel="Add tier"
        blockKind="price-tiers"
      />
    </div>
  );
}
