"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import type { BlogPostListItem } from "../services/tenant-blog.service";
import { useDeleteBlogPost } from "../hooks/use-tenant-blog";
import { BlogStatusBadge } from "./BlogStatusBadge";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function BlogPostListRow({
  post,
  editHref,
}: {
  post: BlogPostListItem;
  editHref: string;
}) {
  const { toast } = useToast();
  const deleteMutation = useDeleteBlogPost();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(post.id);
      toast({ title: "Post deleted" });
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
            {post.title}
          </Link>
          {post.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {post.excerpt}
            </p>
          )}
        </TableCell>
        <TableCell>
          <BlogStatusBadge status={post.status} />
        </TableCell>
        <TableCell className="text-sm">
          {post.category?.name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm">
          {post.authorName ?? <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-sm">
          {formatDate(post.publishedAt)}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            aria-label={`Delete ${post.title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TableCell>
      </TableRow>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{post.title}&quot;?
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
