"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
}

const TestimonialSchema = z.object({
  quote: z.string().max(1000),
  author: z.string().max(100),
  role: z.string().max(100).optional(),
  avatar: z.string().optional(),
});

interface TestimonialsBuilderProps {
  value: Testimonial[];
  onChange: (testimonials: Testimonial[]) => void;
  label?: string;
}

export function TestimonialsBuilder({
  value,
  onChange,
  label = "Testimonials",
}: TestimonialsBuilderProps) {
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
            schema={TestimonialSchema}
            values={item}
            onChange={(fieldName, fieldValue) => {
              const updated = [...value];
              updated[index] = { ...item, [fieldName]: fieldValue };
              onChange(updated);
            }}
            blockKind="testimonials"
          />
        )}
        renderCollapsedTitle={(item) =>
          `${item.author} — ${item.role || "Customer"}`
        }
        addLabel="Add testimonial"
        blockKind="testimonials"
      />
    </div>
  );
}
