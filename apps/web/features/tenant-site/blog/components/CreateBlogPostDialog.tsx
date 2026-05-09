"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBlogPost,
  useBlogCategoriesQuery,
} from "../../hooks/use-blog";

const CreateBlogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  categoryId: z.string().optional(),
  scheduledPublishAt: z.string().optional(),
});

type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;

interface CreateBlogPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (postId: string) => void;
}

export function CreateBlogPostDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBlogPostDialogProps) {
  const createPost = useCreateBlogPost();
  const { data: categories = [] } = useBlogCategoriesQuery();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateBlogPostInput>({
    resolver: zodResolver(CreateBlogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      categoryId: "",
    },
  });

  const onSubmit = async (data: CreateBlogPostInput) => {
    try {
      setError(null);
      const result = await createPost.mutateAsync({
        title: data.title,
        slug: data.slug,
        categoryId: data.categoryId || null,
        scheduledPublishAt: data.scheduledPublishAt
          ? new Date(data.scheduledPublishAt).toISOString()
          : null,
      });
      form.reset();
      onCreated(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write new post</DialogTitle>
          <DialogDescription>
            Start a new blog post. You can edit it in the editor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Why we cook over almond wood"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., almond-wood" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledPublishAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule publish (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPost.isPending}>
                {createPost.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
