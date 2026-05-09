"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  BlockNode,
  BlueprintScope,
  TemplatePageDefinition,
} from "@repo/shared";
import { BLUEPRINT_SCOPES } from "@repo/shared";
import { MOCK_DATA_CONTEXT } from "@repo/blocks";
import {
  useTemplate,
  useUpdateTemplate,
  useUpdateCanonicalTemplate,
} from "../hooks/use-templates";
import { useToast } from "@/hooks/useToast";
import { useEditorStore } from "@/features/tenant-site/site-editor/store/editor-store";
import { selectLoad } from "@/features/tenant-site/site-editor/store/selectors";
import { BlockTreeEditor } from "@/features/tenant-site/site-editor/BlockTreeEditor";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type PageItem =
  | { type: "scope"; scope: BlueprintScope }
  | { type: "custom"; page: TemplatePageDefinition };

interface TemplateEditorPageProps {
  templateId: string;
  isPlatformAdmin: boolean;
}

export function TemplateEditorPage({
  templateId,
  isPlatformAdmin,
}: TemplateEditorPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const load = useEditorStore(selectLoad);

  // Edited state
  const [layouts, setLayouts] = useState<Record<BlueprintScope, BlockNode[]>>(
    {} as Record<BlueprintScope, BlockNode[]>,
  );
  const [pages, setPages] = useState<TemplatePageDefinition[]>([]);
  const [selectedItem, setSelectedItem] = useState<PageItem>({
    type: "scope",
    scope: "home",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const templateQuery = useTemplate(templateId);
  const updateMutation = useUpdateTemplate();
  const updateCanonicalMutation = useUpdateCanonicalTemplate();

  // Initialize from template query
  useEffect(() => {
    if (templateQuery.data) {
      setLayouts(
        (templateQuery.data.defaultLayouts ?? {}) as Record<
          BlueprintScope,
          BlockNode[]
        >,
      );
      setPages(
        (templateQuery.data.defaultPages ?? []) as TemplatePageDefinition[],
      );
    }
  }, [templateQuery.data]);

  // Get current blocks for the selected page
  const currentBlocks = useMemo(() => {
    if (selectedItem.type === "scope") {
      return layouts[selectedItem.scope] ?? [];
    } else {
      return selectedItem.page.blocks ?? [];
    }
  }, [selectedItem, layouts]);

  // Handle blocks change from editor
  const handleBlocksChange = (newBlocks: BlockNode[]) => {
    if (selectedItem.type === "scope") {
      setLayouts((prev) => ({
        ...prev,
        [selectedItem.scope]: newBlocks,
      }));
    } else {
      setPages((prev) =>
        prev.map((p) =>
          p.slug === selectedItem.page.slug ? { ...p, blocks: newBlocks } : p,
        ),
      );
    }
  };

  // Switch page and save current state
  const handleSelectPage = (item: PageItem) => {
    setSelectedItem(item);
    const blocks =
      item.type === "scope"
        ? (layouts[item.scope] ?? [])
        : (item.page.blocks ?? []);
    load(blocks);
  };

  // Save all edits
  const handleSave = async () => {
    if (!templateQuery.data) return;
    setIsSaving(true);

    try {
      const payload: {
        defaultLayouts: Record<BlueprintScope, BlockNode[]>;
        defaultPages?: TemplatePageDefinition[];
      } = { defaultLayouts: layouts };
      if (pages.length > 0) {
        payload.defaultPages = pages;
      }

      if (isPlatformAdmin) {
        await updateCanonicalMutation.mutateAsync({ id: templateId, payload });
      } else {
        await updateMutation.mutateAsync({ id: templateId, payload });
      }

      toast({ title: "Template saved successfully" });
      router.back();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (templateQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (templateQuery.isError || !templateQuery.data) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load template</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const template = templateQuery.data;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-sunken)]">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-gray-900">
              {template.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Edit template layouts and pages
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main: sidebar + editor */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: page list */}
        <div className="w-56 border-r bg-white overflow-y-auto">
          <div className="p-4">
            {/* Scopes group */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase px-2 mb-2">
                Scopes
              </h3>
              <nav className="space-y-1">
                {BLUEPRINT_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => handleSelectPage({ type: "scope", scope })}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedItem.type === "scope" &&
                      selectedItem.scope === scope
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </nav>
            </div>

            {/* Custom pages group */}
            {pages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-gray-700 uppercase px-2 mb-2">
                  Custom Pages
                </h3>
                <nav className="space-y-1">
                  {pages.map((page) => (
                    <button
                      key={page.slug}
                      onClick={() => handleSelectPage({ type: "custom", page })}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedItem.type === "custom" &&
                        selectedItem.page.slug === page.slug
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{page.title}</div>
                      <div className="text-xs text-gray-500">/{page.slug}</div>
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page title bar */}
          <div className="border-b bg-white px-6 py-3">
            <h2 className="text-sm font-medium text-gray-900">
              {selectedItem.type === "scope"
                ? `${selectedItem.scope} layout`
                : `Custom page: ${selectedItem.page.title}`}
            </h2>
          </div>

          {/* Editor */}
          <BlockTreeEditor
            blocks={currentBlocks}
            onChange={handleBlocksChange}
            dataContext={MOCK_DATA_CONTEXT}
            workspace="template"
            pageId={
              selectedItem.type === "scope"
                ? selectedItem.scope
                : selectedItem.page.slug
            }
            scope={selectedItem.type === "scope" ? selectedItem.scope : "page"}
          />
        </div>
      </div>
    </div>
  );
}
