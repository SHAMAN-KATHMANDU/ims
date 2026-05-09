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
import { useCreatePage } from "../../hooks/use-pages";

const CreatePageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  scheduledPublishAt: z.string().optional(),
});

type CreatePageInput = z.infer<typeof CreatePageSchema>;

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (pageId: string) => void;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePageDialogProps) {
  const createPage = useCreatePage();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreatePageInput>({
    resolver: zodResolver(CreatePageSchema),
    defaultValues: {
      title: "",
      slug: "",
    },
  });

  const onSubmit = async (data: CreatePageInput) => {
    try {
      setError(null);
      const result = await createPage.mutateAsync({
        title: data.title,
        slug: data.slug,
        scheduledPublishAt: data.scheduledPublishAt
          ? new Date(data.scheduledPublishAt).toISOString()
          : null,
      });
      form.reset();
      onCreated(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new page</DialogTitle>
          <DialogDescription>
            Add a new page to your site. You can edit the content in the
            builder.
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
                    <Input placeholder="e.g., About Us" {...field} />
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
                    <Input placeholder="e.g., /about" {...field} />
                  </FormControl>
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
              <Button type="submit" disabled={createPage.isPending}>
                {createPage.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
