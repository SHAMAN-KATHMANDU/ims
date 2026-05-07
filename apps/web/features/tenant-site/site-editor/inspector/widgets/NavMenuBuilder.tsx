"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface NavMenuItem {
  label: string;
  href: string;
  hasMegaMenu?: boolean;
}

const NavMenuItemSchema = z.object({
  label: z.string().max(100),
  href: z.string().max(500),
  hasMegaMenu: z.boolean().optional(),
});

interface NavMenuBuilderProps {
  value: NavMenuItem[];
  onChange: (items: NavMenuItem[]) => void;
  label?: string;
}

export function NavMenuBuilder({
  value,
  onChange,
  label = "Menu Items",
}: NavMenuBuilderProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <ArrayBuilder<NavMenuItem>
        value={value}
        onChange={onChange}
        renderRow={(item, index) => (
          <AutoForm
            schema={NavMenuItemSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="nav-bar"
          />
        )}
        renderCollapsedTitle={(item) => item.label || "Menu item"}
        addLabel="Add menu item"
        blockKind="nav-bar"
      />
    </div>
  );
}
