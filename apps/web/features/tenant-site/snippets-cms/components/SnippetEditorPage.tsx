"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnippet, useUpdateSnippet } from "../hooks/use-snippets-cms";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";

export function SnippetEditorPage({
  snippetId,
}: {
  snippetId: string;
}): React.ReactElement {
  const router = useRouter();
  const snippetQuery = useSnippet(snippetId);
  const updateMutation = useUpdateSnippet();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const debouncedName = useDebounce(name, 800);
  const debouncedContent = useDebounce(content, 800);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (snippetQuery.data) {
      setName(snippetQuery.data.name);
      setContent(
        typeof snippetQuery.data.content === "string"
          ? snippetQuery.data.content
          : JSON.stringify(snippetQuery.data.content, null, 2),
      );
    }
  }, [snippetQuery.data]);

  const handleSave = useCallback((): void => {
    if (!isDirty || !snippetQuery.data) return;

    const updateData: Record<string, unknown> = { name };

    if (snippetQuery.data.type === "html") {
      updateData.content = content;
    } else {
      try {
        updateData.content = JSON.parse(content);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Please fix the JSON syntax",
          variant: "destructive",
        });
        return;
      }
    }

    updateMutation.mutate(
      {
        id: snippetId,
        data: updateData,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
        },
      },
    );
  }, [
    isDirty,
    snippetQuery.data,
    name,
    content,
    snippetId,
    toast,
    updateMutation,
  ]);

  // Autosave on debounced changes
  useEffect(() => {
    if (!isDirty) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [debouncedName, debouncedContent, isDirty, handleSave]);

  if (snippetQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading snippet…
      </div>
    );
  }

  if (!snippetQuery.data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Snippet not found</p>
        </div>
      </div>
    );
  }

  const snippet = snippetQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{snippet.name}</h1>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="snippet-name">Name</Label>
          <Input
            id="snippet-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Snippet name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="snippet-content">
            {snippet.type === "html" ? "HTML Content" : "Block JSON"}
          </Label>
          <textarea
            id="snippet-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Snippet content"
            className="w-full h-96 p-3 font-mono text-sm border border-border rounded-md bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            {snippet.type === "block"
              ? "Edit the block tree as JSON. Used in " +
                snippet.uses +
                " pages."
              : "Edit raw HTML content."}
          </p>
        </div>
      </div>
    </div>
  );
}
