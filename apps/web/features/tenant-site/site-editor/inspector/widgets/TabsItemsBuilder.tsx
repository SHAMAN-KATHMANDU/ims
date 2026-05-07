"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface TabsItem {
  label: string;
  content: string;
}

const TabsItemSchema = z.object({
  label: z.string().max(100),
  content: z.string().max(50000),
});

interface TabsItemsBuilderProps {
  value: TabsItem[];
  onChange: (tabs: TabsItem[]) => void;
  label?: string;
}

export function TabsItemsBuilder({
  value,
  onChange,
  label = "Tabs",
}: TabsItemsBuilderProps) {
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
            schema={TabsItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="tabs"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Tab"}
        addLabel="Add tab"
        blockKind="tabs"
      />
    </div>
  );
}
