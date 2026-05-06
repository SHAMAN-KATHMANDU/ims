"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { ContentBlockEditor } from "@/features/content";
import type { BlockNode } from "@repo/shared";
import { useSnippet, useUpdateSnippet } from "../hooks/use-snippets";
import {
  SnippetFormSchema,
  type SnippetFormInput,
  slugifyTitle,
} from "../validation";

function workspaceFromPath(pathname: string | null): string {
  if (!pathname) return "admin";
  return pathname.split("/").filter(Boolean)[0] ?? "admin";
}

export function SnippetEditorPage({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const workspace = workspaceFromPath(pathname);
  const { toast } = useToast();

  const query = useSnippet(id);
  const updateMutation = useUpdateSnippet();

  const form = useForm<SnippetFormInput>({
    resolver: zodResolver(SnippetFormSchema),
    mode: "onBlur",
    defaultValues: {
      slug: "",
      title: "",
      category: "",
      body: [],
    },
  });

  const [slugTouched, setSlugTouched] = useState(true);

  useEffect(() => {
    if (!query.data) return;
    form.reset({
      slug: query.data.slug,
      title: query.data.title,
      category: query.data.category ?? "",
      body: (query.data.body ?? []) as unknown as BlockNode[],
    });
    setSlugTouched(true);
  }, [query.data, form]);

  // Auto-slug from title until slug is touched manually.
  const watchedTitle = form.watch("title");
  useEffect(() => {
    if (slugTouched) return;
    const next = slugifyTitle(watchedTitle ?? "");
    if (next && next !== form.getValues("slug")) {
      form.setValue("slug", next, { shouldValidate: false });
    }
  }, [watchedTitle, slugTouched, form]);

  const handleSave = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          slug: values.slug,
          title: values.title,
          category: values.category?.trim() ? values.category.trim() : null,
          body: values.body as unknown as SnippetFormInput["body"],
        },
      });
      toast({ title: "Snippet saved" });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (query.error || !query.data) {
    return <p className="text-sm text-destructive">Could not load snippet.</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${workspace}/content/snippets`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          All snippets
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snippet</CardTitle>
          <CardDescription>
            A reusable block sub-tree. Reference this from any page or post via
            the Snippet block.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="snippet-title">Title</Label>
              <Input id="snippet-title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="snippet-slug">Slug</Label>
              <Input
                id="snippet-slug"
                {...form.register("slug", {
                  onChange: () => setSlugTouched(true),
                })}
              />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="snippet-category">Category (optional)</Label>
            <Input
              id="snippet-category"
              {...form.register("category")}
              placeholder="headers, promos, ctas…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
          <CardDescription>
            Compose the blocks that should render wherever this snippet is
            referenced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="body"
            render={({ field }) => (
              <ContentBlockEditor
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </CardContent>
      </Card>
    </form>
  );
}
