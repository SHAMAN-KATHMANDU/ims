"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductFormValues } from "../../types";
import type { Category } from "@/hooks/useProduct";
import type { UseFormReturn } from "@/hooks/useForm";

interface GeneralTabProps {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
}

export function GeneralTab({ form, categories }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="imsCode">IMS Code</Label>
        <Input
          id="imsCode"
          value={form.values.imsCode}
          onChange={(e) => form.handleChange("imsCode", e.target.value)}
        />
        {form.errors.imsCode && (
          <p className="text-sm text-destructive">{form.errors.imsCode}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          value={form.values.name}
          onChange={(e) => form.handleChange("name", e.target.value)}
        />
        {form.errors.name && (
          <p className="text-sm text-destructive">{form.errors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <Select
          value={form.values.categoryId}
          onValueChange={(value) => form.handleChange("categoryId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.errors.categoryId && (
          <p className="text-sm text-destructive">{form.errors.categoryId}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.values.description}
          onChange={(e) => form.handleChange("description", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costPrice">Cost Price</Label>
          <Input
            id="costPrice"
            type="number"
            value={form.values.costPrice}
            onChange={(e) => form.handleChange("costPrice", e.target.value)}
          />
          {form.errors.costPrice && (
            <p className="text-sm text-destructive">{form.errors.costPrice}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mrp">MRP</Label>
          <Input
            id="mrp"
            type="number"
            value={form.values.mrp}
            onChange={(e) => form.handleChange("mrp", e.target.value)}
          />
          {form.errors.mrp && (
            <p className="text-sm text-destructive">{form.errors.mrp}</p>
          )}
        </div>
      </div>
    </div>
  );
}
