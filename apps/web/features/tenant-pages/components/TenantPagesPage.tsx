"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Lock, Trash2, Eye, EyeOff, Copy, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Can, useCan } from "@/features/permissions";
import { useToast } from "@/hooks/useToast";
import {
  useTenantPages,
  useDeleteTenantPage,
  usePublishTenantPage,
  useUnpublishTenantPage,
  useDuplicateTenantPage,
} from "../hooks/use-tenant-pages";
import type { TenantPageListItem } from "../services/tenant-pages.service";
import { useSiteConfig, useUpdateSiteConfig } from "@/features/tenant-site";

// Built-in pages every tenant site has
const BUILT_IN_PAGES: {
  scope: string;
  label: string;
  path: string;
  description: string;
}[] = [
  { scope: "home", label: "Home", path: "/", description: "Landing page" },
  {
    scope: "products-index",
    label: "Shop",
    path: "/products",
    description: "Product catalogue",
  },
  {
    scope: "offers",
    label: "Offers",
    path: "/offers",
    description: "Deals & promotions",
  },
  {
    scope: "blog-index",
    label: "Blog",
    path: "/blog",
    description: "Articles & news",
  },
  {
    scope: "contact",
    label: "Contact",
    path: "/contact",
    description: "Contact page",
  },
];

function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

function FeatureDisabledCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <CardTitle>Website feature not enabled</CardTitle>
          <CardDescription>
            Custom pages are part of the website product. Ask your platform
            administrator to turn it on for this workspace.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function BuiltInPagesCard() {
  const { toast } = useToast();
  const configQuery = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();

  const disabledPages: string[] = Array.isArray(
    (configQuery.data?.features as Record<string, unknown> | null)
      ?.disabledPages,
  )
    ? ((configQuery.data?.features as Record<string, unknown>)
        .disabledPages as string[])
    : [];

  const isActive = (scope: string) => !disabledPages.includes(scope);

  const handleToggle = async (scope: string, currentlyActive: boolean) => {
    const next = currentlyActive
      ? [...disabledPages, scope]
      : disabledPages.filter((s) => s !== scope);

    try {
      await updateConfig.mutateAsync({
        features: {
          ...(configQuery.data?.features ?? {}),
          disabledPages: next,
        },
      });
      toast({
        title: currentlyActive ? "Page hidden" : "Page activated",
      });
    } catch {
      toast({
        title: "Failed to update page",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Built-in pages</CardTitle>
        <CardDescription>
          Toggle pages on or off. Inactive pages are hidden from visitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {BUILT_IN_PAGES.map((page) => {
            const active = isActive(page.scope);
            return (
              <div
                key={page.scope}
                className="flex items-center justify-between gap-4 px-6 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{page.label}</span>
                      <Badge
                        variant={active ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {page.path} · {page.description}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={() => handleToggle(page.scope, active)}
                  disabled={updateConfig.isPending || configQuery.isLoading}
                  aria-label={`Toggle ${page.label} page`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PageRow({
  page,
  editHref,
  onToggled,
  onDeleted,
  onDuplicated,
}: {
  page: TenantPageListItem;
  editHref: string;
  onToggled: () => void;
  onDeleted: () => void;
  onDuplicated: () => void;
}) {
  const { toast } = useToast();
  const publishMutation = usePublishTenantPage();
  const unpublishMutation = useUnpublishTenantPage();
  const deleteMutation = useDeleteTenantPage();
  const duplicateMutation = useDuplicateTenantPage();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { allowed: canPublish } = useCan("WEBSITE.PAGES.PUBLISH");
  const { allowed: canUpdate } = useCan("WEBSITE.PAGES.UPDATE");
  const { allowed: canDelete } = useCan("WEBSITE.PAGES.DELETE");

  const handleToggle = async () => {
    try {
      if (page.isPublished) {
        await unpublishMutation.mutateAsync(page.id);
        toast({ title: "Page unpublished" });
      } else {
        await publishMutation.mutateAsync(page.id);
        toast({ title: "Page published" });
      }
      onToggled();
    } catch (error) {
      toast({
        title: "Action failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(page.id);
      toast({ title: "Page deleted" });
      onDeleted();
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
    <>
      <TableRow>
        <TableCell>
          <Link href={editHref} className="font-medium hover:underline">
            {page.title}
          </Link>
          <div className="text-xs text-muted-foreground">/{page.slug}</div>
        </TableCell>
        <TableCell>
          <Switch
            checked={page.isPublished}
            onCheckedChange={canPublish ? handleToggle : undefined}
            disabled={
              !canPublish ||
              publishMutation.isPending ||
              unpublishMutation.isPending
            }
            aria-label={page.isPublished ? "Unpublish page" : "Publish page"}
          />
        </TableCell>
        <TableCell className="text-sm">
          {page.showInNav ? (
            <span className="text-foreground">In nav · {page.navOrder}</span>
          ) : (
            <span className="text-muted-foreground">Hidden</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {canPublish && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              disabled={
                publishMutation.isPending || unpublishMutation.isPending
              }
              aria-label={page.isPublished ? "Unpublish" : "Publish"}
            >
              {page.isPublished ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                try {
                  await duplicateMutation.mutateAsync(page.id);
                  toast({ title: "Page duplicated" });
                  onDuplicated();
                } catch (error) {
                  toast({
                    title: "Duplicate failed",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again",
                    variant: "destructive",
                  });
                }
              }}
              disabled={duplicateMutation.isPending}
              aria-label={`Duplicate ${page.title}`}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
              aria-label={`Delete ${page.title}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </TableCell>
      </TableRow>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{page.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TenantPagesPage({
  newHref,
  editHrefBase,
}: {
  newHref: string;
  editHrefBase: string;
}) {
  const [search, setSearch] = useState("");
  const pagesQuery = useTenantPages({ page: 1, limit: 50 });
  const disabled = pagesQuery.isError && isForbiddenError(pagesQuery.error);

  if (disabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Your About, FAQ, Shipping, Lookbook, and other custom pages.
          </p>
        </div>
        <FeatureDisabledCard />
      </div>
    );
  }

  const allPages = pagesQuery.data?.pages ?? [];
  const filtered = search.trim()
    ? allPages.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : allPages;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Manage all your site pages — built-in and custom.
          </p>
        </div>
        <Can perm="WEBSITE.PAGES.CREATE">
          <Button asChild>
            <Link href={newHref}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New page
            </Link>
          </Button>
        </Can>
      </div>

      {/* Built-in pages */}
      <BuiltInPagesCard />

      {/* Custom pages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Custom pages</h2>
            <p className="text-sm text-muted-foreground">
              About, FAQ, Shipping, Lookbook — anything the built-in pages
              don&apos;t cover.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Input
              placeholder="Search by title or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent className="pt-0">
            {pagesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading pages…</p>
            )}
            {!pagesQuery.isLoading && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No custom pages yet.{" "}
                <Link href={newHref} className="underline underline-offset-4">
                  Create your first page
                </Link>
              </p>
            )}
            {filtered.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title / Slug</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Nav</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <PageRow
                      key={p.id}
                      page={p}
                      editHref={`${editHrefBase}/${p.id}`}
                      onToggled={() => pagesQuery.refetch()}
                      onDeleted={() => pagesQuery.refetch()}
                      onDuplicated={() => pagesQuery.refetch()}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
