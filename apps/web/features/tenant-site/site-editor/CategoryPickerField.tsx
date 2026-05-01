"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/features/products";

// Radix Select forbids empty-string item values, so the "no category"
// option uses a sentinel that we translate back to "" at the edges.
const ALL_CATEGORIES = "__all__";

interface CategoryPickerFieldProps {
  value: string;
  onChange: (id: string) => void;
}

export function CategoryPickerField({
  value,
  onChange,
}: CategoryPickerFieldProps) {
  const query = useCategories();
  const categories = query.data ?? [];

  const selected = value === "" ? ALL_CATEGORIES : value;

  return (
    <div className="space-y-1">
      <Label className="text-xs">Category</Label>
      <Select
        value={selected}
        onValueChange={(v) => onChange(v === ALL_CATEGORIES ? "" : v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
