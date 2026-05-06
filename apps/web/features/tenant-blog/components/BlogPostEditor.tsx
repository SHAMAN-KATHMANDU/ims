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
import { MediaPickerField } from "@/features/media";
import {
  ContentBlockEditor,
  VersionHistorySheet,
  PageHeaderCustomization,
} from "@/features/content";
import { blocksToMarkdown, type BlockNode } from "@repo/shared";
import { History as HistoryIcon, MessageSquare } from "lucide-react";
import { CommentsSheet } from "@/features/block-comments";
import {
  useBlogPostVersions,
  useRestoreBlogPostVersion,
  useRequestBlogReview,
  useApproveBlogReview,
  useRejectBlogReview,
} from "../hooks/use-tenant-blog";
import { BlogMarkdownEditor } from "./BlogMarkdownEditor";
import { BlogStatusBadge } from "./BlogStatusBadge";
import { ReviewStatusControls } from "@/features/content";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
import { useAuthStore, selectUserRole } from "@/store/auth-store";

type BodyMode = "markdown" | "blocks";

/**
 * Convert an ISO timestamp to the `YYYY-MM-DDTHH:MM` shape the
 * `<input type="datetime-local">` expects (in the user's local TZ),
 * and back. Returning null clears the schedule.
 */
function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function SchedulePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="datetime-local"
        value={isoToLocalInput(value)}
        onChange={(e) => onChange(localInputToIso(e.target.value))}
        className="w-auto"
        aria-label="Scheduled publish time"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

function BodyModeToggle({
  mode,
  onChange,
}: {
  mode: BodyMode;
  onChange: (next: BodyMode) => void;
}) {
  const baseClass =
    "px-2.5 h-7 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors";
  return (
    <div
      role="tablist"
      aria-label="Body editor mode"
      className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "blocks"}
        onClick={() => onChange("blocks")}
        className={`${baseClass} ${
          mode === "blocks"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Blocks
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "markdown"}
        onClick={() => onChange("markdown")}
        className={`${baseClass} ${
          mode === "markdown"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Markdown
      </button>
    </div>
  );
}

function toFormValues(post?: BlogPost | null): BlogPostFormInput {
  const body = (post?.body ?? []) as unknown as BlockNode[];
  return {
    slug: post?.slug ?? "",
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    bodyMarkdown: post?.bodyMarkdown ?? "",
    body,
    scheduledPublishAt: post?.scheduledPublishAt ?? null,
    heroImageUrl: post?.heroImageUrl ?? undefined,
    coverImageUrl: post?.coverImageUrl ?? undefined,
    icon: post?.icon ?? "",
    authorName: post?.authorName ?? "",
    categoryId: post?.categoryId ?? undefined,
    tags: post?.tags ?? [],
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
  };
}

function toApiPayload(values: BlogPostFormInput): CreateBlogPostData {
  // When the editor has a non-empty block tree we send `body` as the
  // canonical source; the API derives bodyMarkdown server-side. When the
  // tree is empty we fall back to the markdown textarea content (legacy
  // markdown-only flow). Either path satisfies the API's "one of body or
  // bodyMarkdown" refine.
  const useBlocks = values.body && values.body.length > 0;
  const payload: CreateBlogPostData = {
    slug: values.slug,
    title: values.title,
    excerpt: values.excerpt || null,
    heroImageUrl: values.heroImageUrl || null,
    coverImageUrl: values.coverImageUrl || null,
    icon: values.icon ? values.icon.trim() || null : null,
    authorName: values.authorName || null,
    categoryId: values.categoryId || null,
    tags: values.tags,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
  };
  if (useBlocks) {
    payload.body = values.body as CreateBlogPostData["body"];
  } else {
    payload.bodyMarkdown = values.bodyMarkdown ?? "";
  }
  if (values.scheduledPublishAt !== undefined) {
    payload.scheduledPublishAt = values.scheduledPublishAt;
  }
  return payload;
}

export function BlogPostEditor({
  post,
  backHref,
  onBack,
  onCreated,
}: {
  post?: BlogPost | null;
  backHref?: string;
  onBack?: () => void;
  onCreated?: (post: BlogPost) => void;
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
  const requestReview = useRequestBlogReview();
  const approveReview = useApproveBlogReview();
  const rejectReview = useRejectBlogReview();
  const reviewWorkflowEnabled = useEnvFeatureFlag(
    EnvFeature.CMS_REVIEW_WORKFLOW,
  );
  const userRole = useAuthStore(selectUserRole);
  const isAdmin = userRole === "admin" || userRole === "superAdmin";

  const [slugTouched, setSlugTouched] = useState(!!post);
  const [tagInput, setTagInput] = useState((post?.tags ?? []).join(", "));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Default body mode: Blocks when the post already has a non-empty block
  // tree (post-Phase-2 default for new posts via API), otherwise Markdown
  // for legacy posts whose body is still the bodyMarkdown column.
  const initialMode: BodyMode =
    (post?.body?.length ?? 0) > 0 ? "blocks" : "markdown";
  const [bodyMode, setBodyMode] = useState<BodyMode>(initialMode);

  useEffect(() => {
    form.reset(toFormValues(post));
    setSlugTouched(!!post);
    setTagInput((post?.tags ?? []).join(", "));
    // Re-derive body mode when switching between posts — otherwise editing
    // a post with `body` after one without (or vice-versa) leaves the toggle
    // pointing at the wrong editor and silently drops content on save.
    setBodyMode((post?.body?.length ?? 0) > 0 ? "blocks" : "markdown");
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
        if (onCreated) {
          onCreated(created);
        } else if (backHref) {
          router.push(`${backHref}/${created.id}`);
        }
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
          {isEdit && post && reviewWorkflowEnabled && (
            <ReviewStatusControls
              recordId={post.id}
              status={post.reviewStatus ?? "DRAFT"}
              isAdmin={isAdmin}
              onRequestReview={requestReview}
              onApprove={approveReview}
              onReject={rejectReview}
            />
          )}
          {isEdit && post && reviewWorkflowEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCommentsOpen(true)}
              aria-label="Comments"
            >
              <MessageSquare
                className="mr-1.5 h-3.5 w-3.5"
                aria-hidden="true"
              />
              Comments
            </Button>
          )}
          {isEdit && post && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              aria-label="Version history"
            >
              <HistoryIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              History
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onBack) onBack();
              else if (backHref) router.push(backHref);
            }}
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
              aria-invalid={form.formState.errors.title ? true : undefined}
              aria-describedby={
                form.formState.errors.title ? "blog-title-error" : undefined
              }
            />
            {form.formState.errors.title && (
              <p id="blog-title-error" className="text-xs text-destructive">
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
              aria-invalid={form.formState.errors.slug ? true : undefined}
              aria-describedby={
                form.formState.errors.slug
                  ? "blog-slug-hint blog-slug-error"
                  : "blog-slug-hint"
              }
            />
            <p id="blog-slug-hint" className="text-xs text-muted-foreground">
              The URL path: /blog/{values.slug || "your-slug"}
            </p>
            {form.formState.errors.slug && (
              <p id="blog-slug-error" className="text-xs text-destructive">
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

          <div
            className="space-y-2"
            role="group"
            aria-labelledby="blog-body-label"
          >
            <div className="flex items-center justify-between gap-2">
              <Label id="blog-body-label">Body</Label>
              <BodyModeToggle
                mode={bodyMode}
                onChange={(next) => {
                  if (next === bodyMode) return;
                  if (next === "blocks") {
                    // markdown → blocks: wrap existing markdown into a
                    // single markdown-body block so the user keeps their
                    // content. They can split it into smaller blocks
                    // afterwards via the palette.
                    const md = (form.getValues("bodyMarkdown") ?? "").trim();
                    const blocks: BlockNode[] = md
                      ? [
                          {
                            id: `md-${Math.random().toString(36).slice(2, 8)}`,
                            kind: "markdown-body" as BlockNode["kind"],
                            props: { source: md } as BlockNode["props"],
                          },
                        ]
                      : [];
                    form.setValue("body", blocks, { shouldDirty: true });
                  } else {
                    // blocks → markdown: render the tree as markdown and
                    // empty the block list so save uses the markdown path.
                    const blocks = form.getValues("body") ?? [];
                    const md = blocksToMarkdown(blocks);
                    form.setValue("bodyMarkdown", md, { shouldDirty: true });
                    form.setValue("body", [], { shouldDirty: true });
                  }
                  setBodyMode(next);
                }}
              />
            </div>
            {bodyMode === "blocks" ? (
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
            ) : (
              <Controller
                control={form.control}
                name="bodyMarkdown"
                render={({ field }) => (
                  <BlogMarkdownEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            )}
            {form.formState.errors.body && (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.body.message as string}
              </p>
            )}
            {form.formState.errors.bodyMarkdown && (
              <p className="text-xs text-destructive" role="alert">
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
              <Label htmlFor="blog-category">Category</Label>
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
                    <SelectTrigger id="blog-category" aria-label="Category">
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
              aria-describedby="blog-tags-hint"
            />
            <p id="blog-tags-hint" className="text-xs text-muted-foreground">
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
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.heroImageUrl.message}
              </p>
            )}
          </div>

          <Controller
            control={form.control}
            name="coverImageUrl"
            render={({ field: coverField }) => (
              <Controller
                control={form.control}
                name="icon"
                render={({ field: iconField }) => (
                  <PageHeaderCustomization
                    coverImageUrl={coverField.value ?? undefined}
                    icon={iconField.value ?? ""}
                    onCoverChange={(next) =>
                      coverField.onChange(next ?? undefined)
                    }
                    onIconChange={(next) => iconField.onChange(next)}
                    idPrefix="blog"
                  />
                )}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>
            Schedule a draft to publish automatically. The scheduler runs every
            5 minutes; the post flips to PUBLISHED on the next pass after the
            chosen time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="blog-schedule">Scheduled publish time</Label>
            <Controller
              control={form.control}
              name="scheduledPublishAt"
              render={({ field }) => (
                <SchedulePicker
                  id="blog-schedule"
                  value={field.value as string | null | undefined}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to publish manually. Already-published posts ignore
              this field.
            </p>
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

      {isEdit && post && (
        <VersionHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          recordId={post.id}
          recordLabel={`post "${post.title}"`}
          title="Post history"
          useVersions={useBlogPostVersions}
          useRestore={useRestoreBlogPostVersion}
        />
      )}
      {isEdit && post && reviewWorkflowEnabled && (
        <CommentsSheet
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          recordType="BLOG_POST"
          recordId={post.id}
          recordLabel={`post "${post.title}"`}
        />
      )}
    </form>
  );
}
