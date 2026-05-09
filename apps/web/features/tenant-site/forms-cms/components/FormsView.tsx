"use client";

import type React from "react";
import { useState } from "react";
import { Download, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/hooks/useToast";
import {
  useFormsQuery,
  useFormSubmissionsQuery,
  useFormQuery,
} from "../../hooks/use-forms";
import { FormEditorDialog } from "./FormEditorDialog";

export function FormsView() {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const { data: formsData } = useFormsQuery();
  const { data: submissionsData } = useFormSubmissionsQuery(
    selectedFormId ?? "",
  );

  const forms = formsData?.forms ?? [];
  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const editingFormQuery = useFormQuery(editingFormId ?? "");
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
            <Button
              size="sm"
              onClick={() => {
                setEditingFormId(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New form
            </Button>
          </div>
        }
      />

      {forms.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-sm">
            No forms yet. Click <strong>New form</strong> above to build your
            first form, or add a form block to a page in the builder.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setEditingFormId(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create your first form
          </Button>
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
              <div
                key={form.id}
                className={`w-full px-4 py-3 border-b text-sm transition-colors flex items-center gap-2 ${
                  selectedFormId === form.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFormId(form.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {form.submissionCount} submission
                    {form.submissionCount !== 1 ? "s" : ""}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Edit ${form.name}`}
                  onClick={() => {
                    setEditingFormId(form.id);
                    setEditorOpen(true);
                  }}
                  className="p-1 rounded hover:bg-muted"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
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
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) setEditingFormId(null);
        }}
        form={
          editingFormId && editingFormQuery.data
            ? // FormEditorDialog narrows Form.fields to FormFieldUI[]; the API
              // returns them as unknown[] (FormFieldDef[]) — they're shape-compatible.
              (editingFormQuery.data.form as React.ComponentProps<
                typeof FormEditorDialog
              >["form"])
            : null
        }
      />
    </div>
  );
}
