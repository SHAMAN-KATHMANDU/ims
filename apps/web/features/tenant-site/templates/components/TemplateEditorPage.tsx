"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BlockNode, BlueprintScope } from "@repo/shared";
import { BLUEPRINT_SCOPES } from "@repo/shared";
import {
  useTemplate,
  useUpdateTemplate,
  useUpdateCanonicalTemplate,
} from "../hooks/use-templates";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
  const [selectedScope, setSelectedScope] = useState<BlueprintScope>("home");
  const [layouts, setLayouts] = useState<Record<BlueprintScope, BlockNode[]>>(
    {} as Record<BlueprintScope, BlockNode[]>,
  );
  const [isSaving, setIsSaving] = useState(false);

  const templateQuery = useTemplate(templateId);
  const updateMutation = useUpdateTemplate();
  const updateCanonicalMutation = useUpdateCanonicalTemplate();

  // Initialize layouts from template
  useEffect(() => {
    if (templateQuery.data?.defaultLayouts) {
      setLayouts(
        templateQuery.data.defaultLayouts as Record<
          BlueprintScope,
          BlockNode[]
        >,
      );
    }
  }, [templateQuery.data]);

  const handleSaveLayout = async () => {
    if (!templateQuery.data) return;

    setIsSaving(true);
    const payload = {
      defaultLayouts: layouts,
    };

    try {
      if (isPlatformAdmin) {
        await updateCanonicalMutation.mutateAsync({ id: templateId, payload });
      } else {
        await updateMutation.mutateAsync({ id: templateId, payload });
      }
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-gray-900">
              {template.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Edit template layouts</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveLayout} disabled={isSaving}>
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6">
            <Tabs
              value={selectedScope}
              onValueChange={(v) => setSelectedScope(v as BlueprintScope)}
            >
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
                {BLUEPRINT_SCOPES.map((scope) => (
                  <TabsTrigger
                    key={scope}
                    value={scope}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                  >
                    {scope}
                  </TabsTrigger>
                ))}
              </TabsList>

              {BLUEPRINT_SCOPES.map((scope) => (
                <TabsContent key={scope} value={scope} className="mt-6">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Layouts for the{" "}
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {scope}
                      </code>{" "}
                      scope.
                      {!layouts[scope] ? (
                        <span className="text-amber-700 ml-2">
                          No layout defined yet.
                        </span>
                      ) : (
                        <span className="text-green-700 ml-2">
                          {layouts[scope].length} blocks
                        </span>
                      )}
                    </p>
                    <div className="bg-gray-100 rounded border border-gray-300 p-8 min-h-[300px] flex items-center justify-center text-gray-600">
                      <div className="text-center">
                        <p>
                          Block editor for <strong>{scope}</strong>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          (Full block editor integration would replace this)
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
