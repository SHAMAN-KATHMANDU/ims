"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  TenantPageFormSchema,
  type TenantPageFormInput,
  slugifyTitle,
  pageSeoPreview,
} from "../validation";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  useCreateTenantPage,
  useUpdateTenantPage,
  usePublishTenantPage,
  useUnpublishTenantPage,
  useTenantPagePreviewUrl,
} from "../hooks/use-tenant-pages";
import type {
  TenantPage,
  CreateTenantPageData,
} from "../services/tenant-pages.service";
import { BlogMarkdownEditor } from "@/features/tenant-blog/components/BlogMarkdownEditor";

function toFormValues(page?: TenantPage | null): TenantPageFormInput {
  return {
    slug: page?.slug ?? "",
    title: page?.title ?? "",
    bodyMarkdown: page?.bodyMarkdown ?? "",
    layoutVariant: page?.layoutVariant ?? "default",
    showInNav: page?.showInNav ?? true,
    navOrder: page?.navOrder ?? 0,
    seoTitle: page?.seoTitle ?? "",
    seoDescription: page?.seoDescription ?? "",
  };
}

function toApiPayload(values: TenantPageFormInput): CreateTenantPageData {
  return {
    slug: values.slug,
    title: values.title,
    bodyMarkdown: values.bodyMarkdown,
    layoutVariant: values.layoutVariant,
    showInNav: values.showInNav,
    navOrder: values.navOrder,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
  };
}

export function TenantPageEditor({
  page,
  backHref,
  onBack,
  onCreated,
  disablePreview = false,
}: {
  page?: TenantPage | null;
  backHref?: string;
  onBack?: () => void;
  onCreated?: (page: TenantPage) => void;
  disablePreview?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!page;

  const form = useForm<TenantPageFormInput>({
    resolver: zodResolver(TenantPageFormSchema),
    mode: "onBlur",
    defaultValues: toFormValues(page),
  });

  const createMutation = useCreateTenantPage();
  const updateMutation = useUpdateTenantPage();
  const publishMutation = usePublishTenantPage();
  const unpublishMutation = useUnpublishTenantPage();

  const [slugTouched, setSlugTouched] = useState(!!page);

  useEffect(() => {
    form.reset(toFormValues(page));
    setSlugTouched(!!page);
  }, [page, form]);

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
      pageSeoPreview({
        title: values.title,
        seoTitle: values.seoTitle ?? "",
        seoDescription: values.seoDescription ?? "",
      }),
    [values.title, values.seoTitle, values.seoDescription],
  );

  const handleSave = form.handleSubmit(async (data) => {
    try {
      const payload = toApiPayload(data);
      if (isEdit && page) {
        await updateMutation.mutateAsync({ id: page.id, data: payload });
        toast({ title: "Page saved" });
        setPreviewRefreshKey((k) => k + 1);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast({ title: "Page created (draft)" });
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
    if (!page) return;
    try {
      if (page.isPublished) {
        await unpublishMutation.mutateAsync(page.id);
        toast({ title: "Page unpublished" });
      } else {
        await publishMutation.mutateAsync(page.id);
        toast({ title: "Page published" });
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

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isToggling = publishMutation.isPending || unpublishMutation.isPending;

  // Live preview iframe — only meaningful for saved pages (the URL needs a
  // page id). Bumping `previewRefreshKey` forces a reload after Save so the
  // iframe shows the just-persisted draft body without a manual refresh.
  const previewUrlQuery = useTenantPagePreviewUrl(page?.id ?? null);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const previewSrc = useMemo(() => {
    const base = previewUrlQuery.data;
    if (!base) return null;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}r=${previewRefreshKey}`;
  }, [previewUrlQuery.data, previewRefreshKey]);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit page" : "New page"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Changes go live after Save. Live preview to the right reflects the saved draft."
              : "Creates a draft. Publish after saving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && page && (
            <Badge variant={page.isPublished ? "default" : "secondary"}>
              {page.isPublished ? "Published" : "Draft"}
            </Badge>
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
          {isEdit && page && (
            <Button
              type="button"
              variant={page.isPublished ? "outline" : "default"}
              onClick={handlePublishToggle}
              disabled={isToggling}
            >
              {page.isPublished ? "Unpublish" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <div
        className={
          isEdit && !disablePreview
            ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            : ""
        }
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page</CardTitle>
              <CardDescription>
                Markdown is supported. Live preview shows as you type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="page-title">Title</Label>
                <Input
                  id="page-title"
                  {...form.register("title")}
                  placeholder="About us"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-slug">Slug</Label>
                <Input
                  id="page-slug"
                  {...form.register("slug")}
                  onChange={(e) => {
                    setSlugTouched(true);
                    form.setValue("slug", e.target.value);
                  }}
                  placeholder="about"
                />
                <p className="text-xs text-muted-foreground">
                  The URL path: /{values.slug || "your-slug"}
                </p>
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Controller
                  control={form.control}
                  name="bodyMarkdown"
                  render={({ field }) => (
                    <BlogMarkdownEditor
                      id="page-body-markdown"
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
              <CardTitle>Navigation & layout</CardTitle>
              <CardDescription>
                Where this page appears on your tenant-site, and how it reads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Layout variant</Label>
                  <Controller
                    control={form.control}
                    name="layoutVariant"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "default"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">
                            Default (820px)
                          </SelectItem>
                          <SelectItem value="narrow">Narrow (640px)</SelectItem>
                          <SelectItem value="full-width">
                            Full width (1200px)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Content column width on the tenant-site.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page-nav-order">Nav order</Label>
                  <Input
                    id="page-nav-order"
                    type="number"
                    min={0}
                    {...form.register("navOrder", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in the header nav.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <Controller
                  control={form.control}
                  name="showInNav"
                  render={({ field }) => (
                    <Switch
                      id="page-show-in-nav"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="page-show-in-nav"
                    className="text-sm font-medium"
                  >
                    Show in site header
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If off, the page is still live at /{values.slug || "slug"}{" "}
                    but the tenant-site header won&apos;t list it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Optional — falls back to the page title.
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
                      <Label htmlFor="page-seo-title">Meta title</Label>
                      <Input
                        id="page-seo-title"
                        {...form.register("seoTitle")}
                        placeholder={values.title || "Page title"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-seo-desc">Meta description</Label>
                      <Textarea
                        id="page-seo-desc"
                        rows={3}
                        {...form.register("seoDescription")}
                        placeholder="A short description for search engines."
                      />
                    </div>
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium">{preview.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {preview.description || "—"}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {isEdit && !disablePreview && (
          <div className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
            <Card className="flex h-full flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Live preview</CardTitle>
                  <CardDescription className="text-xs">
                    Reflects the saved draft. Save to refresh.
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewRefreshKey((k) => k + 1)}
                    disabled={!previewSrc}
                    aria-label="Refresh preview"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {previewSrc && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label="Open preview in new tab"
                    >
                      <a
                        href={previewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {previewUrlQuery.isLoading && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading preview…
                  </div>
                )}
                {previewUrlQuery.isError && (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    Couldn&apos;t load preview URL.{" "}
                    {previewUrlQuery.error instanceof Error
                      ? previewUrlQuery.error.message
                      : ""}
                  </div>
                )}
                {previewSrc && (
                  <iframe
                    key={previewSrc}
                    src={previewSrc}
                    title="Page preview"
                    className="h-full min-h-[600px] w-full rounded-b-md border-0"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </form>
  );
}
