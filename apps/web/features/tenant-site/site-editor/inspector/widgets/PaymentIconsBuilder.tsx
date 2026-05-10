"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface PaymentIcon {
  name: string;
}

const PaymentIconSchema = z.object({
  name: z.string().max(100),
});

interface PaymentIconsBuilderProps {
  value: PaymentIcon[];
  onChange: (items: PaymentIcon[]) => void;
  label?: string;
}

export function PaymentIconsBuilder({
  value,
  onChange,
  label = "Payment icons",
}: PaymentIconsBuilderProps) {
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
            schema={PaymentIconSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="payment-icons"
          />
        )}
        renderCollapsedTitle={(item) => item.name || "Icon"}
        addLabel="Add payment icon"
        blockKind="payment-icons"
      />
    </div>
  );
}
