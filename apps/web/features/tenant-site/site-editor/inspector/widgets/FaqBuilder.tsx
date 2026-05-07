"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface FaqItem {
  question: string;
  answer: string;
}

const FaqItemSchema = z.object({
  question: z.string().max(300),
  answer: z.string().max(3000),
});

interface FaqBuilderProps {
  value: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  label?: string;
}

export function FaqBuilder({
  value,
  onChange,
  label = "FAQ Items",
}: FaqBuilderProps) {
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
            schema={FaqItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="faq"
          />
        )}
        renderCollapsedTitle={(item) => item.question || "Question"}
        addLabel="Add question"
        blockKind="faq"
      />
    </div>
  );
}
