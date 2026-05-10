"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface Logo {
  src: string;
  alt: string;
}

const LogoSchema = z.object({
  src: z.string().max(1000),
  alt: z.string().max(200),
});

interface LogoCloudBuilderProps {
  value: Logo[];
  onChange: (logos: Logo[]) => void;
  label?: string;
}

export function LogoCloudBuilder({
  value,
  onChange,
  label = "Logos",
}: LogoCloudBuilderProps) {
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
            schema={LogoSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="logo-cloud"
          />
        )}
        renderCollapsedTitle={(item) => item.alt || "Logo"}
        addLabel="Add logo"
        blockKind="logo-cloud"
      />
    </div>
  );
}
