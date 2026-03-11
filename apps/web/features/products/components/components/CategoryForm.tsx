"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { CategoryFormValues } from "../types";
import type { UseFormReturn } from "@/hooks/useForm";
import type { Category } from "@/features/products";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CategoryFormValues>;
  editingCategory: Category | null;
  onReset: () => void;
}

export function CategoryForm({
  open,
  onOpenChange,
  form,
  editingCategory,
  onReset,
}: CategoryFormProps) {
  const [subcategoryInput, setSubcategoryInput] = useState("");

  const subcategories = form.values.subcategories ?? [];

  const handleAddSubcategory = () => {
    const trimmed = subcategoryInput.trim();
    if (!trimmed || subcategories.includes(trimmed)) return;
    form.setValues({
      subcategories: [...subcategories, trimmed],
    });
    setSubcategoryInput("");
  };

  const handleRemoveSubcategory = (name: string) => {
    form.setValues({
      subcategories: subcategories.filter((s) => s !== name),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            onReset();
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={form.values.name}
              onChange={(e) => form.handleChange("name", e.target.value)}
            />
            {form.errors.name && (
              <p className="text-sm text-destructive">{form.errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              value={form.values.description}
              onChange={(e) => form.handleChange("description", e.target.value)}
            />
          </div>
          {!editingCategory && (
            <div className="space-y-2">
              <Label>Subcategories (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Add subcategories for this category. You can also add them later
                via the Manage subcategories action.
              </p>
              {subcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {subcategories.map((sub) => (
                    <Badge
                      key={sub}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSubcategory(sub)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <Input
                  value={subcategoryInput}
                  onChange={(e) => setSubcategoryInput(e.target.value)}
                  placeholder="Enter subcategory name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubcategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSubcategory}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          )}
          {form.errors._form && (
            <p className="text-sm text-destructive">{form.errors._form}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onReset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.isLoading}>
              {form.isLoading
                ? "Saving..."
                : editingCategory
                  ? "Update"
                  : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
