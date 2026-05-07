"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface AccordionItem {
  title: string;
  body: string;
}

const AccordionItemSchema = z.object({
  title: z.string().max(300),
  body: z.string().max(5000),
});

interface AccordionItemsBuilderProps {
  value: AccordionItem[];
  onChange: (items: AccordionItem[]) => void;
  label?: string;
}

export function AccordionItemsBuilder({
  value,
  onChange,
  label = "Accordion Items",
}: AccordionItemsBuilderProps) {
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
            schema={AccordionItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="accordion"
          />
        )}
        renderCollapsedTitle={(item) => item.title || "Item"}
        addLabel="Add item"
        blockKind="accordion"
      />
    </div>
  );
}
