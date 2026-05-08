"use client";

import type { JSX } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSetBreadcrumbs, useHideCmsTopbar } from "../hooks/use-breadcrumbs";
import {
  useBlogPost,
  useUpdateBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
} from "@/features/tenant-blog";
import { Btn } from "../components/ui";
import { ArrowLeft, RotateCcw, RotateCw, Eye } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () =>
    import("../components/TiptapEditor").then((mod) => ({
      default: mod.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => <div style={{ padding: 20 }}>Loading editor…</div>,
  },
);

export function PostEditor(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const queryClient = useQueryClient();

  useHideCmsTopbar();

  const { data: post, isLoading: postLoading } = useBlogPost(postId);
  const updateMutation = useUpdateBlogPost();
  const publishMutation = usePublishBlogPost();
  const unpublishMutation = useUnpublishBlogPost();

  const [title, setTitle] = useState(post?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(post?.bodyMarkdown ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!post || (!title && !bodyMarkdown)) return;
      if (title === post.title && bodyMarkdown === post.bodyMarkdown) return;

      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          id: postId,
          data: {
            title: title || post.title,
            bodyMarkdown: bodyMarkdown || post.bodyMarkdown,
          },
        });
        queryClient.invalidateQueries({
          queryKey: ["blogPost", postId],
        });
      } catch (error) {
        console.error("Autosave failed:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, bodyMarkdown, post, postId, updateMutation, queryClient]);

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(postId);
      queryClient.invalidateQueries({
        queryKey: ["blogPost", postId],
      });
    } catch (error) {
      console.error("Publish failed:", error);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishMutation.mutateAsync(postId);
      queryClient.invalidateQueries({
        queryKey: ["blogPost", postId],
      });
    } catch (error) {
      console.error("Unpublish failed:", error);
    }
  };

  useSetBreadcrumbs(["Site", "Blog", post?.title || "Untitled"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={ArrowLeft} onClick={() => router.back()}>
          Back
        </Btn>
        <Btn icon={RotateCcw} disabled>
          Undo
        </Btn>
        <Btn icon={RotateCw} disabled>
          Redo
        </Btn>
        <Btn icon={Eye}>Preview</Btn>
        {post?.status === "PUBLISHED" ? (
          <Btn variant="primary" onClick={handleUnpublish}>
            Unpublish
          </Btn>
        ) : (
          <Btn variant="primary" onClick={handlePublish}>
            Publish
          </Btn>
        )}
      </div>
    ),
  });

  if (postLoading) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        Loading post…
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Post not found</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid var(--line)",
            backgroundColor: "var(--bg)",
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            style={{
              fontSize: 28,
              fontWeight: 600,
              border: "none",
              background: "transparent",
              color: "var(--ink)",
              width: "100%",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          {isSaving && (
            <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 8 }}>
              Saving…
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 40,
            maxWidth: "720px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <TiptapEditor
            initialContent={bodyMarkdown}
            onChange={(content) => setBodyMarkdown(content)}
          />
        </div>
      </div>
    </div>
  );
}
