"use client";

import { Badge } from "@/components/ui/badge";
import type { BlogPostStatus } from "../services/tenant-blog.service";

const LABELS: Record<BlogPostStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const VARIANTS: Record<BlogPostStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

export function BlogStatusBadge({ status }: { status: BlogPostStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
