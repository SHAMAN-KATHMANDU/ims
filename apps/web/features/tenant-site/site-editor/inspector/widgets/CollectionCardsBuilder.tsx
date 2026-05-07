"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface CollectionCard {
  title: string;
  image?: string;
  link?: string;
  description?: string;
}

const CollectionCardSchema = z.object({
  title: z.string().max(100),
  image: z.string().optional(),
  link: z.string().max(500).optional(),
  description: z.string().max(300).optional(),
});

interface CollectionCardsBuilderProps {
  value: CollectionCard[];
  onChange: (cards: CollectionCard[]) => void;
  label?: string;
}

export function CollectionCardsBuilder({
  value,
  onChange,
  label = "Collection Cards",
}: CollectionCardsBuilderProps) {
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
            schema={CollectionCardSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="collection-cards"
          />
        )}
        renderCollapsedTitle={(item) => item.title || "Card"}
        addLabel="Add card"
        blockKind="collection-cards"
      />
    </div>
  );
}
