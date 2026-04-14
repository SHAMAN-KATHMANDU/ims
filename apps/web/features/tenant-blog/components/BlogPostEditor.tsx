"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/useToast";
import {
  BlogPostFormSchema,
  type BlogPostFormInput,
  slugifyTitle,
  parseTagInput,
  seoPreview,
} from "../validation";
import {
  useCreateBlogPost,
  useUpdateBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
  useBlogCategories,
} from "../hooks/use-tenant-blog";
import type {
  BlogPost,
  CreateBlogPostData,
} from "../services/tenant-blog.service";
import { MediaPickerField } from "@/components/media/MediaPickerField";
import { BlogMarkdownEditor } from "./BlogMarkdownEditor";
import { BlogStatusBadge } from "./BlogStatusBadge";

function toFormValues(post?: BlogPost | null): BlogPostFormInput {
  return {
    slug: post?.slug ?? "",
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    bodyMarkdown: post?.bodyMarkdown ?? "",
    heroImageUrl: post?.heroImageUrl ?? undefined,
    authorName: post?.authorName ?? "",
    categoryId: post?.categoryId ?? undefined,
    tags: post?.tags ?? [],
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
  };
}

function toApiPayload(values: BlogPostFormInput): CreateBlogPostData {
  return {
    slug: values.slug,
    title: values.title,
    bodyMarkdown: values.bodyMarkdown,
    excerpt: values.excerpt || null,
    heroImageUrl: values.heroImageUrl || null,
    authorName: values.authorName || null,
    categoryId: values.categoryId || null,
    tags: values.tags,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
  };
}

export function BlogPostEditor({
  post,
  backHref,
}: {
  post?: BlogPost | null;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!post;

  const form = useForm<BlogPostFormInput>({
    resolver: zodResolver(BlogPostFormSchema),
    mode: "onBlur",
    defaultValues: toFormValues(post),
  });

  const categoriesQuery = useBlogCategories();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const publishMutation = usePublishBlogPost();
  const unpublishMutation = useUnpublishBlogPost();

  const [slugTouched, setSlugTouched] = useState(!!post);
  const [tagInput, setTagInput] = useState((post?.tags ?? []).join(", "));

  useEffect(() => {
    form.reset(toFormValues(post));
    setSlugTouched(!!post);
    setTagInput((post?.tags ?? []).join(", "));
  }, [post, form]);

  // Auto-generate slug from title until the user manually edits the slug field.
  const watchedTitle = form.watch("title");
  useEffect(() => {
    if (slugTouched) return;
    const suggestion = slugifyTitle(watchedTitle);
    if (suggestion !== form.getValues("slug")) {
      form.setValue("slug", suggestion, { shouldValidate: false });
    }
  }, [watchedTitle, slugTouched, form]);

  const values = form.watch();
  const preview = useMemo(
    () =>
      seoPreview({
        title: values.title,
        excerpt: values.excerpt ?? "",
        seoTitle: values.seoTitle ?? "",
        seoDescription: values.seoDescription ?? "",
      }),
    [values.title, values.excerpt, values.seoTitle, values.seoDescription],
  );

  const handleTagBlur = () => {
    form.setValue("tags", parseTagInput(tagInput));
  };

  const handleSave = form.handleSubmit(async (data) => {
    try {
      const payload = toApiPayload(data);
      if (isEdit && post) {
        await updateMutation.mutateAsync({ id: post.id, data: payload });
        toast({ title: "Post saved" });
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast({ title: "Draft created" });
        router.push(`${backHref}/${created.id}`);
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handlePublishToggle = async () => {
    if (!post) return;
    try {
      if (post.status === "PUBLISHED") {
        await unpublishMutation.mutateAsync(post.id);
        toast({ title: "Post unpublished" });
      } else {
        await publishMutation.mutateAsync(post.id);
        toast({ title: "Post published" });
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const categories = categoriesQuery.data ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit post" : "New post"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Saving creates a new version immediately."
              : "Creates a draft. You can publish after saving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && post && <BlogStatusBadge status={post.status} />}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          {isEdit && post && (
            <Button
              type="button"
              variant={post.status === "PUBLISHED" ? "outline" : "default"}
              onClick={handlePublishToggle}
              disabled={
                publishMutation.isPending || unpublishMutation.isPending
              }
            >
              {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post</CardTitle>
          <CardDescription>
            Markdown is supported. A preview shows as you type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-title">Title</Label>
            <Input
              id="blog-title"
              {...form.register("title")}
              placeholder="Welcome to our journal"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-slug">Slug</Label>
            <Input
              id="blog-slug"
              {...form.register("slug")}
              onChange={(e) => {
                setSlugTouched(true);
                form.setValue("slug", e.target.value);
              }}
              placeholder="welcome-to-our-journal"
            />
            <p className="text-xs text-muted-foreground">
              The URL path: /blog/{values.slug || "your-slug"}
            </p>
            {form.formState.errors.slug && (
              <p className="text-xs text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-excerpt">Excerpt</Label>
            <Textarea
              id="blog-excerpt"
              rows={2}
              {...form.register("excerpt")}
              placeholder="A one- or two-sentence intro shown in listings."
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Controller
              control={form.control}
              name="bodyMarkdown"
              render={({ field }) => (
                <BlogMarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.bodyMarkdown && (
              <p className="text-xs text-destructive">
                {form.formState.errors.bodyMarkdown.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Author, category, tags, and hero image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="blog-author">Author</Label>
              <Input
                id="blog-author"
                {...form.register("authorName")}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) =>
                      field.onChange(v === "none" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-tags">Tags</Label>
            <Input
              id="blog-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onBlur={handleTagBlur}
              placeholder="welcome, intro, launch"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Max 20 tags, 40 characters each.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blog-hero">Hero image</Label>
            <Controller
              control={form.control}
              name="heroImageUrl"
              render={({ field }) => (
                <MediaPickerField
                  id="blog-hero"
                  value={field.value ?? ""}
                  onChange={(next) => field.onChange(next || undefined)}
                  previewSize={96}
                  helperText="Wide landscape photos work best (16:9 or 4:3)."
                />
              )}
            />
            {form.formState.errors.heroImageUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.heroImageUrl.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>
            Optional — falls back to title and excerpt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="seo">
              <AccordionTrigger>
                Search preview: {preview.title || "(untitled)"}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="blog-seo-title">Meta title</Label>
                  <Input
                    id="blog-seo-title"
                    {...form.register("seoTitle")}
                    placeholder={values.title || "Post title"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-seo-desc">Meta description</Label>
                  <Textarea
                    id="blog-seo-desc"
                    rows={3}
                    {...form.register("seoDescription")}
                    placeholder={
                      values.excerpt ||
                      "A short description for search engines."
                    }
                  />
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium">{preview.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {preview.description}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </form>
  );
}
