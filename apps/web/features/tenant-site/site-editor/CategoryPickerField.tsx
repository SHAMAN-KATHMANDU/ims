"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/features/products/hooks/use-products";

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

  return (
    <div className="space-y-1">
      <Label className="text-xs">Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All categories</SelectItem>
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
