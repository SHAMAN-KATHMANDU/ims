"use client";

import { useState } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  useFormsStore,
  selectForms,
  selectSubmissions,
  selectSelectedFormId,
  selectSetSelectedFormId,
} from "../store";
import { FormEditorDialog } from "./FormEditorDialog";

export function FormsView() {
  const [editorOpen, setEditorOpen] = useState(false);
  const forms = useFormsStore(selectForms);
  const submissions = useFormsStore(selectSubmissions);
  const selectedFormId = useFormsStore(selectSelectedFormId);
  const setSelectedFormId = useFormsStore(selectSetSelectedFormId);

  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const formSubmissions = submissions.filter(
    (s) => s.formId === selectedFormId,
  );
  const totalSubmissions = submissions.length;

  const handleSelectForm = (formId: string) => {
    setSelectedFormId(formId);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Forms & submissions"
        description={`${totalSubmissions} total submissions across ${forms.length} forms.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setEditorOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New form
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[320px_1fr] gap-4">
        {/* Forms list */}
        <Card className="overflow-hidden">
          <div className="border-b px-4 py-3 text-sm font-semibold bg-muted/30">
            Forms
          </div>
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => handleSelectForm(form.id)}
              className={`w-full text-left px-4 py-3 border-b text-sm transition-colors ${
                selectedFormId === form.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{form.name}</span>
                {form.status !== "active" && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {form.status}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {form.submissions} submissions · {form.lastSubmission}
              </div>
            </button>
          ))}
        </Card>

        {/* Submissions */}
        <Card className="overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center gap-2 bg-muted/30">
            <span className="text-sm font-semibold flex-1">
              {selectedForm?.name} — recent submissions
            </span>
            <Button variant="ghost" size="sm">
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              Mark all read
            </Button>
          </div>

          {formSubmissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No submissions yet
            </div>
          ) : (
            <div>
              {formSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="px-4 py-3 border-b grid grid-cols-[32px_1.4fr_1fr_2fr_90px] gap-3 items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {submission.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{submission.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {submission.email}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    {selectedForm?.name || "Form"}
                  </span>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {submission.excerpt}
                  </div>
                  <span className="text-xs text-muted-foreground text-right font-mono">
                    {submission.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <FormEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={null}
      />
    </div>
  );
}
