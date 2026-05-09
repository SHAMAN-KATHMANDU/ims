"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/hooks/useToast";
import { useFormsQuery, useFormSubmissionsQuery } from "../../hooks/use-forms";
import { FormEditorDialog } from "./FormEditorDialog";

export function FormsView() {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const { data: formsData } = useFormsQuery();
  const { data: submissionsData } = useFormSubmissionsQuery(
    selectedFormId ?? "",
  );

  const forms = formsData?.forms ?? [];
  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const formSubmissions = submissionsData?.submissions ?? [];
  const totalSubmissions = submissionsData?.pagination?.total ?? 0;

  const handleExportCsv = () => {
    // TODO: implement CSV export endpoint
    toast({
      title: "CSV export not yet available",
      variant: "destructive",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Forms & submissions"
        description={
          forms.length === 0
            ? "No forms found. Add forms to your pages using the block editor."
            : `${totalSubmissions} total submissions across ${forms.length} forms.`
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        }
      />

      {forms.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-sm">
            No forms yet. Add a form block to a page in the builder to get
            started.
          </p>
        </Card>
      )}

      {forms.length > 0 && (
        <div className="grid grid-cols-[320px_1fr] gap-4">
          {/* Forms list */}
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3 text-sm font-semibold bg-muted/30">
              Forms ({forms.length})
            </div>
            {forms.map((form) => (
              <button
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={`w-full text-left px-4 py-3 border-b text-sm transition-colors ${
                  selectedFormId === form.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {form.submissionCount} submission
                  {form.submissionCount !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </Card>

          {/* Submissions */}
          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3 flex items-center gap-2 bg-muted/30">
              <span className="text-sm font-semibold flex-1">
                {selectedForm?.name || "Select a form"} — recent submissions
              </span>
            </div>

            {!selectedForm ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Select a form to view submissions
              </div>
            ) : formSubmissions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No submissions yet
              </div>
            ) : (
              <div className="divide-y">
                {formSubmissions.map((submission) => {
                  const firstField = (
                    submission.fields as Array<{ label: string; value: string }>
                  )[0];
                  return (
                    <div
                      key={submission.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {firstField?.value ?? "Form submission"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(submission.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <FormEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={null}
      />
    </div>
  );
}
