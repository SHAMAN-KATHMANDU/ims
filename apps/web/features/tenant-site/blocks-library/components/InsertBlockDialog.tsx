"use client";

import type React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePagesQuery } from "../../hooks/use-pages";
import { useBlogPostsQuery } from "../../hooks/use-blog";
import { useUpsertSiteLayoutDraft } from "../../hooks/use-site-layouts";
import { useToast } from "@/hooks/useToast";
import type { CatalogEntry, SiteLayoutScope } from "@repo/shared";

interface PageOption {
  id: string;
  title: string;
  scope: SiteLayoutScope;
  pageId?: string;
}

interface InsertBlockDialogProps {
  block: CatalogEntry;
  onClose: () => void;
}

export function InsertBlockDialog({
  block,
  onClose,
}: InsertBlockDialogProps): React.ReactElement {
  const [selectedPage, setSelectedPage] = useState<PageOption | null>(null);
  const { toast } = useToast();

  const pagesQuery = usePagesQuery();
  const blogQuery = useBlogPostsQuery();
  const upsertLayoutMutation = useUpsertSiteLayoutDraft();

  const builtInPages: PageOption[] = [
    { id: "home", title: "Home", scope: "home" as const },
    {
      id: "products-index",
      title: "Products Index",
      scope: "products-index" as const,
    },
    {
      id: "product-detail",
      title: "Product Detail",
      scope: "product-detail" as const,
    },
    { id: "offers", title: "Offers", scope: "offers" as const },
    { id: "blog-index", title: "Blog Index", scope: "blog-index" as const },
  ];

  const customPages: PageOption[] = [
    ...(pagesQuery.data?.pages ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      scope: "home" as const,
      pageId: p.id,
    })),
    ...(blogQuery.data?.posts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      scope: "blog-post" as const,
      pageId: p.id,
    })),
  ];

  const handleInsert = (): void => {
    if (!selectedPage) {
      toast({
        title: "Please select a page",
        variant: "destructive",
      });
      return;
    }

    const defaultProps = block.createDefaultProps();
    const newBlockNode = {
      id: `block-${Date.now()}`,
      kind: block.kind,
      props: defaultProps,
    };

    // Fetch current layout, add block, and upsert
    upsertLayoutMutation.mutate(
      {
        scope: selectedPage.scope,
        pageId: selectedPage.pageId,
        blocks: [newBlockNode],
      },
      {
        onSuccess: () => {
          toast({
            title: "Block added",
            description: `"${block.label}" added to ${selectedPage.title}`,
          });
          onClose();
        },
        onError: (error) => {
          toast({
            title: "Failed to insert block",
            description: error instanceof Error ? error.message : "Try again",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert block into page</DialogTitle>
          <DialogDescription>
            Select where you want to add &quot;{block.label}&quot;
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="builtin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="builtin">Built-in pages</TabsTrigger>
            <TabsTrigger value="custom">Custom pages</TabsTrigger>
          </TabsList>

          <TabsContent value="builtin" className="space-y-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {builtInPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPage(page)}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedPage?.id === page.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{page.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {page.scope}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3">
            {customPages.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No custom pages yet
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                      selectedPage?.id === page.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{page.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {page.scope === "blog-post" ? "Blog post" : "Custom page"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={upsertLayoutMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!selectedPage || upsertLayoutMutation.isPending}
          >
            {upsertLayoutMutation.isPending ? "Inserting…" : "Insert block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
