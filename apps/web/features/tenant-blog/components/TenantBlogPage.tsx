"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FolderTree, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlogPosts } from "../hooks/use-tenant-blog";
import type { BlogPostStatus } from "../services/tenant-blog.service";
import { BlogPostListRow } from "./BlogPostListRow";
import { BlogCategoryManager } from "./BlogCategoryManager";

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
            Your platform administrator hasn&apos;t turned on the website
            feature for this workspace yet. The blog is part of the website
            product.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export function TenantBlogPage({
  newHref,
  editHrefBase,
}: {
  newHref: string;
  editHrefBase: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogPostStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const query = {
    page,
    limit: 20,
    ...(status !== "ALL" ? { status } : {}),
    ...(search ? { search } : {}),
  };

  const postsQuery = useBlogPosts(query);
  const disabled = postsQuery.isError && isForbiddenError(postsQuery.error);

  if (disabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Write and publish posts on your tenant-site.
          </p>
        </div>
        <FeatureDisabledCard />
      </div>
    );
  }

  const data = postsQuery.data;
  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Write and publish posts on your tenant-site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            <FolderTree className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button asChild>
            <Link href={newHref}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New post
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as BlogPostStatus | "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {postsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading posts…</p>
          )}
          {!postsQuery.isLoading && posts.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No posts yet. Click <strong>New post</strong> to write your first
              one.
            </p>
          )}
          {posts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <BlogPostListRow
                    key={p.id}
                    post={p}
                    editHref={`${editHrefBase}/${p.id}`}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {pageCount} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BlogCategoryManager
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
    </div>
  );
}
