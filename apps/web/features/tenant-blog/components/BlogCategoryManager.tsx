"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  BlogCategoryFormSchema,
  type BlogCategoryFormInput,
  slugifyTitle,
} from "../validation";
import {
  useBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
} from "../hooks/use-tenant-blog";
import type { BlogCategory } from "../services/tenant-blog.service";

function defaults(cat?: BlogCategory | null): BlogCategoryFormInput {
  return {
    slug: cat?.slug ?? "",
    name: cat?.name ?? "",
    description: cat?.description ?? "",
    sortOrder: cat?.sortOrder ?? 0,
  };
}

export function BlogCategoryManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const categoriesQuery = useBlogCategories();
  const createMutation = useCreateBlogCategory();
  const updateMutation = useUpdateBlogCategory();
  const deleteMutation = useDeleteBlogCategory();

  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<BlogCategoryFormInput>({
    resolver: zodResolver(BlogCategoryFormSchema),
    mode: "onBlur",
    defaultValues: defaults(),
  });

  useEffect(() => {
    form.reset(defaults(editing));
    setSlugTouched(!!editing);
  }, [editing, form]);

  const watchedName = form.watch("name");
  useEffect(() => {
    if (slugTouched) return;
    const suggestion = slugifyTitle(watchedName);
    if (suggestion !== form.getValues("slug")) {
      form.setValue("slug", suggestion, { shouldValidate: false });
    }
  }, [watchedName, slugTouched, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            slug: values.slug,
            name: values.name,
            description: values.description || null,
            sortOrder: values.sortOrder,
          },
        });
        toast({ title: "Category updated" });
      } else {
        await createMutation.mutateAsync({
          slug: values.slug,
          name: values.name,
          description: values.description || null,
          sortOrder: values.sortOrder,
        });
        toast({ title: "Category created" });
      }
      setEditing(null);
      form.reset(defaults());
      setSlugTouched(false);
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async (cat: BlogCategory) => {
    if (
      !confirm(
        `Delete "${cat.name}"? Posts in this category will become uncategorized.`,
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(cat.id);
      toast({ title: "Category deleted" });
      if (editing?.id === cat.id) setEditing(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Blog categories</DialogTitle>
          <DialogDescription>
            Group posts by theme. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  {...form.register("slug")}
                  onChange={(e) => {
                    setSlugTouched(true);
                    form.setValue("slug", e.target.value);
                  }}
                />
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                {...form.register("description")}
              />
            </div>
            <div className="flex justify-end gap-2">
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    form.reset(defaults());
                    setSlugTouched(false);
                  }}
                >
                  Cancel edit
                </Button>
              )}
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Save category" : "Add category"}
              </Button>
            </div>
          </form>

          <div>
            <h3 className="mb-2 text-sm font-medium">Existing categories</h3>
            {categoriesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {categoriesQuery.data && categoriesQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No categories yet.
              </p>
            )}
            {categoriesQuery.data && categoriesQuery.data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesQuery.data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium hover:underline"
                          onClick={() => setEditing(c)}
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.slug}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c._count?.posts ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
