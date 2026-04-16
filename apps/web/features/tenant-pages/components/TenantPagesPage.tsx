"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Lock, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/useToast";
import {
  useTenantPages,
  useDeleteTenantPage,
  usePublishTenantPage,
  useUnpublishTenantPage,
  useDuplicateTenantPage,
} from "../hooks/use-tenant-pages";
import type { TenantPageListItem } from "../services/tenant-pages.service";

function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

function FeatureDisabledCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" />
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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
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
          <Badge variant={page.isPublished ? "default" : "secondary"}>
            {page.isPublished ? "Published" : "Draft"}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {page.showInNav ? (
            <span className="text-foreground">In nav · {page.navOrder}</span>
          ) : (
            <span className="text-muted-foreground">Hidden</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {page.layoutVariant}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={publishMutation.isPending || unpublishMutation.isPending}
            aria-label={page.isPublished ? "Unpublish" : "Publish"}
          >
            {page.isPublished ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
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
                    error instanceof Error ? error.message : "Please try again",
                  variant: "destructive",
                });
              }
            }}
            disabled={duplicateMutation.isPending}
            aria-label={`Duplicate ${page.title}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            aria-label={`Delete ${page.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
  const query = { page: 1, limit: 50 };
  const pagesQuery = useTenantPages(query);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-sm text-muted-foreground">
            About, FAQ, Shipping, Lookbook — anything the built-in pages
            don&apos;t already cover.
          </p>
        </div>
        <Button asChild>
          <Link href={newHref}>
            <Plus className="mr-2 h-4 w-4" />
            New page
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="Search by title or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {pagesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading pages…</p>
          )}
          {!pagesQuery.isLoading && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pages yet. Click <strong>New page</strong> to add your first.
            </p>
          )}
          {filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title / Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nav</TableHead>
                  <TableHead>Layout</TableHead>
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
  );
}
