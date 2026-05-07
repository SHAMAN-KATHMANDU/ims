"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface LookbookScene {
  imageUrl: string;
  alt?: string;
  caption?: string;
  pins?: Array<{
    x: number;
    y: number;
    productId: string;
    label?: string;
  }>;
}

const LookbookSceneSchema = z.object({
  imageUrl: z.string().max(1000),
  alt: z.string().max(200).optional(),
  caption: z.string().max(300).optional(),
  pins: z
    .array(
      z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        productId: z.string().max(80),
        label: z.string().max(80).optional(),
      }),
    )
    .optional(),
});

interface LookbookPinsBuilderProps {
  value: LookbookScene[];
  onChange: (scenes: LookbookScene[]) => void;
  label?: string;
}

export function LookbookPinsBuilder({
  value,
  onChange,
  label = "Lookbook Scenes",
}: LookbookPinsBuilderProps) {
  return (
    <div className="space-y-2" data-testid="lookbook-builder">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <ArrayBuilder
        value={value}
        onChange={onChange}
        renderRow={(scene, sceneIndex) => (
          <AutoForm
            schema={LookbookSceneSchema}
            values={scene}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[sceneIndex] = { ...scene, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="lookbook"
          />
        )}
        renderCollapsedTitle={(scene) => scene.alt || "Scene"}
        addLabel="Add scene"
        blockKind="lookbook"
      />
    </div>
  );
}
