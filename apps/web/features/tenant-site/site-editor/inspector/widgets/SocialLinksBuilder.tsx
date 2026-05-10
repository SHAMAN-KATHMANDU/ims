"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface SocialLink {
  platform: string;
  handle?: string;
  href: string;
}

const SocialLinkSchema = z.object({
  platform: z.string().max(50),
  handle: z.string().max(100).optional(),
  href: z.string().max(500),
});

interface SocialLinksBuilderProps {
  value: SocialLink[];
  onChange: (items: SocialLink[]) => void;
  label?: string;
}

export function SocialLinksBuilder({
  value,
  onChange,
  label = "Social links",
}: SocialLinksBuilderProps) {
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
            schema={SocialLinkSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="social-links"
          />
        )}
        renderCollapsedTitle={(item) =>
          item.platform
            ? `${item.platform}${item.handle ? ` · ${item.handle}` : ""}`
            : "Link"
        }
        addLabel="Add social link"
        blockKind="social-links"
      />
    </div>
  );
}
