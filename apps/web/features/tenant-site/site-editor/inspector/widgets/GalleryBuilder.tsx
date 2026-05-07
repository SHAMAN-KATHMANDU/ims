"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

const GalleryImageSchema = z.object({
  src: z.string(),
  alt: z.string().max(200),
  caption: z.string().max(500).optional(),
});

interface GalleryBuilderProps {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  label?: string;
}

export function GalleryBuilder({
  value,
  onChange,
  label = "Gallery Images",
}: GalleryBuilderProps) {
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
            schema={GalleryImageSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="gallery"
          />
        )}
        renderCollapsedTitle={(item) => item.alt || "Image"}
        addLabel="Add image"
        blockKind="gallery"
      />
    </div>
  );
}
