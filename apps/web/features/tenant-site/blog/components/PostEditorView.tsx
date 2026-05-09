"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Sparkles, Eye, ChevronDown, Upload } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  body: string;
  category: string;
  author: string;
  date: string;
  status: "draft" | "published" | "review" | "scheduled";
  tags: string[];
  scheduledDate?: string;
  visibility: "public" | "members" | "unlisted";
  metaDescription: string;
}

export function PostEditorView({ postId }: { postId: string }) {
  const router = useRouter();
  const params = useParams();
  const workspace = params.workspace as string;
  const setActions = useTopbarActionsStore((s) => s.setActions);

  // TODO: Fetch post data via useBlogPostQuery hook when available
  const isNew = postId === "new";
  const [post, setPost] = useState<BlogPost>({
    id: postId,
    title: isNew ? "Untitled post" : "Why we cook over almond wood",
    slug: isNew ? "untitled" : "almond-wood",
    subtitle: isNew
      ? ""
      : "It started, like a lot of things in this kitchen, with a question we couldn't quite stop asking.",
    body: isNew
      ? ""
      : `Almond wood burns differently than oak. It throws less ash, holds heat lower in the firebox, and finishes its perfume sweeter — closer to stone fruit than smoke.

The first night we cooked over it, two things happened. The branzino tasted like a different fish. And every reservation that came in the next morning asked about the smell from the parking lot.`,
    category: isNew ? "Kitchen" : "Kitchen",
    author: "Chef Marcus",
    date: new Date().toISOString().split("T")[0] || new Date().toISOString(),
    status: isNew ? "draft" : "published",
    tags: isNew ? [] : ["fire", "sourcing", "seasonal"],
    visibility: "public",
    metaDescription: isNew
      ? ""
      : "Notes on switching from oak to almond wood at the hearth, and what we noticed in the dining room.",
  });

  const [showSeo, setShowSeo] = useState<boolean>(false);
  const [showSchedule, setShowSchedule] = useState<boolean>(
    post.status === "scheduled",
  );

  useEffect(() => {
    const publishLabel = post.status === "published" ? "Update" : "Publish";
    setActions(
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4" />
          Polish with AI
        </Button>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button size="sm">
          {publishLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions, post.status]);

  const updateField = <K extends keyof BlogPost>(
    key: K,
    value: BlogPost[K],
  ) => {
    setPost((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-sunken)]">
      {/* Topbar */}
      <div className="border-b border-[var(--line)] bg-[var(--bg)] px-3 py-3 flex items-center gap-2.5">
        <button
          onClick={() => router.push(`/${workspace}/content/blog`)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm font-medium hover:bg-[var(--bg-elev)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Journal
        </button>
        <div className="h-6 w-px" style={{ background: "var(--line)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">
            {post.title || "Untitled post"}
          </div>
          <div
            className="mono text-xs truncate"
            style={{ color: "var(--ink-4)" }}
          >
            /blog/{post.slug || "untitled"} · saved 4s ago
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-full max-w-2xl">
            {/* Meta line */}
            <div
              className="mono mb-2 text-xs uppercase tracking-wide"
              style={{ color: "var(--ink-4)" }}
            >
              {post.category} · {post.date}
            </div>

            {/* Title */}
            <input
              value={post.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="serif m-0 w-full text-5xl font-semibold bg-transparent outline-none border-0 leading-tight mb-4 placeholder:text-[var(--ink-3)]"
              placeholder="Why we cook over almond wood"
              style={{ letterSpacing: "-0.8px" }}
            />

            {/* Subtitle */}
            <textarea
              value={post.subtitle}
              onChange={(e) => updateField("subtitle", e.target.value)}
              className="serif w-full text-lg italic bg-transparent outline-none border-0 leading-relaxed text-[var(--ink-3)] mb-6 placeholder:text-[var(--ink-4)] resize-none"
              placeholder="It started, like a lot of things in this kitchen, with a question…"
              rows={2}
            />

            {/* Cover image */}
            <div className="aspect-video bg-gradient-to-br from-[oklch(0.45_0.06_50)] to-[oklch(0.28_0.05_30)] rounded-lg mb-6" />

            {/* Body */}
            <textarea
              value={post.body}
              onChange={(e) => updateField("body", e.target.value)}
              className="serif w-full text-lg bg-transparent outline-none border-0 leading-loose text-[var(--ink-2)] placeholder:text-[var(--ink-4)] resize-none"
              placeholder="Start typing or paste your content here…"
              rows={10}
              style={{ fontFamily: "var(--font-serif)" }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 border-l border-[var(--line)] bg-[var(--bg)] p-3.5 overflow-auto space-y-3.5">
          {/* Cover preview */}
          <div>
            <Label className="text-xs font-semibold block mb-2">
              Cover image
            </Label>
            <div className="aspect-video bg-gradient-to-br from-[oklch(0.45_0.06_50)] to-[oklch(0.28_0.05_30)] rounded border border-[var(--line)] mb-2" />
            <Button variant="outline" size="sm" className="w-full">
              <Upload className="h-4 w-4" />
              Replace
            </Button>
          </div>

          {/* Meta */}
          <div>
            <div className="text-xs font-semibold mb-2.5">Meta</div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="slug" className="text-xs">
                  Slug
                </Label>
                <Input
                  id="slug"
                  value={post.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <Select
                  value={post.category}
                  onValueChange={(v) => updateField("category", v)}
                >
                  <SelectTrigger id="category" className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kitchen">Kitchen</SelectItem>
                    <SelectItem value="Sourcing">Sourcing</SelectItem>
                    <SelectItem value="Wine">Wine</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                    <SelectItem value="Events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs block mb-1.5">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  <button className="mono text-xs text-[var(--ink-4)] hover:text-[var(--ink)]">
                    + add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className="text-xs font-semibold w-full text-left mb-2.5 hover:text-[var(--accent)]"
            >
              Schedule {showSchedule ? "▾" : "▸"}
            </button>
            {showSchedule && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="schedule-date" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="visibility" className="text-xs">
                    Visibility
                  </Label>
                  <Select
                    value={post.visibility}
                    onValueChange={(v) =>
                      updateField("visibility", v as BlogPost["visibility"])
                    }
                  >
                    <SelectTrigger id="visibility" className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="members">Members only</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* SEO */}
          <div>
            <button
              onClick={() => setShowSeo(!showSeo)}
              className="text-xs font-semibold w-full text-left mb-2.5 hover:text-[var(--accent)]"
            >
              SEO {showSeo ? "▾" : "▸"}
            </button>
            {showSeo && (
              <div>
                <Label htmlFor="meta-desc" className="text-xs block mb-1.5">
                  Meta description
                </Label>
                <textarea
                  id="meta-desc"
                  value={post.metaDescription}
                  onChange={(e) =>
                    updateField("metaDescription", e.target.value)
                  }
                  className="w-full text-xs p-2 rounded border border-[var(--line)] bg-[var(--bg-sunken)] outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  rows={2}
                  placeholder="Describe this post for search engines…"
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
