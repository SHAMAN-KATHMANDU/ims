"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type { Category } from "@/features/products";
import { CategoryFormSchema, type CategoryFormInput } from "../../validation";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  initialSubcategoryNames?: string[];
  onSubmit: (data: CategoryFormInput) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
}

export function CategoryForm({
  open,
  onOpenChange,
  editingCategory,
  initialSubcategoryNames,
  onSubmit,
  onReset,
  isLoading = false,
}: CategoryFormProps) {
  const [subcategoryInput, setSubcategoryInput] = useState("");

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(CategoryFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      subcategories: [],
    },
  });

  useEffect(() => {
    if (open && editingCategory) {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description || "",
        subcategories: initialSubcategoryNames ?? [],
      });
    } else if (!open) {
      form.reset({ name: "", description: "", subcategories: [] });
      setSubcategoryInput("");
    }
  }, [open, editingCategory, initialSubcategoryNames, form]);

  const handleAddSubcategory = () => {
    const trimmed = subcategoryInput.trim();
    const current = form.getValues("subcategories") ?? [];
    if (!trimmed || current.includes(trimmed)) return;
    form.setValue("subcategories", [...current, trimmed]);
    setSubcategoryInput("");
  };

  const handleRemoveSubcategory = (index: number) => {
    const current = form.getValues("subcategories") ?? [];
    form.setValue(
      "subcategories",
      current.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
    onReset();
  });

  const subcategories = form.watch("subcategories") ?? [];

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
      <DialogContent allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Subcategories (optional)</Label>
            <p className="text-xs text-muted-foreground">
              {editingCategory
                ? "Add or remove subcategories for this category."
                : "Add subcategories for this category. You can also add them later via the Manage subcategories action."}
            </p>
            {subcategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {subcategories.map((sub, index) => (
                  <Badge
                    key={`${sub}-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSubcategory(index)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingCategory ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
