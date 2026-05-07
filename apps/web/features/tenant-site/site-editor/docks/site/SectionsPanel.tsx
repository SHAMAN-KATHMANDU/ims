"use client";

import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
  useSiteSections,
  useUpdateSiteSections,
} from "../../../hooks/use-site-sections";

export function SectionsPanel() {
  const { toast } = useToast();
  const sectionsQuery = useSiteSections();
  const updateMutation = useUpdateSiteSections();

  const sections = sectionsQuery.data ?? {};

  const handleToggle = (sectionKey: string) => {
    const updated = {
      ...sections,
      [sectionKey]: !(sections[sectionKey as keyof typeof sections] ?? true),
    };
    updateMutation.mutate(updated, {
      onSuccess: () => {
        toast({ title: "Section updated" });
      },
      onError: () => {
        toast({
          title: "Failed to update section",
          variant: "destructive",
        });
      },
    });
  };

  const handleResetToDefaults = () => {
    if (confirm("Reset all sections to template defaults?")) {
      updateMutation.mutate(
        {},
        {
          onSuccess: () => {
            toast({ title: "Sections reset to template defaults" });
          },
          onError: () => {
            toast({
              title: "Failed to reset sections",
              variant: "destructive",
            });
          },
        },
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Sections</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sectionsQuery.isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading sections…
          </div>
        )}

        {!sectionsQuery.isLoading && (
          <>
            {Object.entries(sections).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No sections to configure
              </div>
            ) : (
              Object.entries(sections).map(([key, enabled]) => (
                <div
                  key={key}
                  className="p-3 rounded-md border border-border bg-card flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {enabled ? "Enabled" : "Hidden"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={enabled ? "default" : "outline"}
                    className="text-xs h-7"
                    onClick={() => handleToggle(key)}
                    disabled={updateMutation.isPending}
                  >
                    {enabled ? "Hide" : "Show"}
                  </Button>
                </div>
              ))
            )}
          </>
        )}

        <div className="pt-4 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleResetToDefaults}
            disabled={updateMutation.isPending || sectionsQuery.isLoading}
          >
            Reset to template defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
