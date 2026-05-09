"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
} from "../../hooks/use-forms";
import type { Form } from "../../services/forms.service";

interface FormFieldUI {
  kind: "text" | "email" | "textarea" | "phone" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  width?: "full" | "half";
}

interface FormEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: (Form & { fields: FormFieldUI[] }) | null;
}

export function FormEditorDialog({
  open,
  onOpenChange,
  form,
}: FormEditorDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<FormFieldUI[]>([]);
  const [submitTo, setSubmitTo] = useState<"email" | "webhook" | "crm-lead">(
    "email",
  );
  const [successMessage, setSuccessMessage] = useState("");

  const createForm = useCreateForm();
  const updateForm = useUpdateForm();

  useEffect(() => {
    if (form) {
      setName(form.name);
      setSlug(form.slug);
      setFields(form.fields);
      setSubmitTo(form.submitTo as "email" | "webhook" | "crm-lead");
      setSuccessMessage(form.successMessage ?? "");
    } else {
      setName("");
      setSlug("");
      setFields([]);
      setSubmitTo("email");
      setSuccessMessage("");
    }
  }, [form]);

  const handleAddField = () => {
    const newField: FormFieldUI = {
      kind: "text",
      label: "New field",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updates: Partial<FormFieldUI>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }
    if (!slug.trim()) {
      toast({ title: "Form slug is required", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }

    try {
      if (form) {
        await updateForm.mutateAsync({
          id: form.id,
          payload: {
            name,
            slug,
            fields,
            submitTo,
            successMessage,
          },
        });
      } else {
        await createForm.mutateAsync({
          name,
          slug,
          fields,
          submitTo,
          successMessage,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling done by hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form ? "Edit form" : "Create form"}</DialogTitle>
          <DialogDescription>
            {form
              ? "Update the form settings and fields."
              : "Create a new form to collect submissions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Contact form"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Form slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., contact-form"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddField}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add field
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg space-y-2 bg-muted/30"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Label
                    </label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        handleUpdateField(index, { label: e.target.value })
                      }
                      placeholder="Field label"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Type
                    </label>
                    <Select
                      value={field.kind}
                      onValueChange={(value: string) =>
                        handleUpdateField(index, {
                          kind: value as FormFieldUI["kind"],
                        })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) =>
                        handleUpdateField(index, {
                          required: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">Required</span>
                  </label>
                  <button
                    onClick={() => handleRemoveField(index)}
                    className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="submitTo">Send submissions to</Label>
              <Select
                value={submitTo}
                onValueChange={(v: string) =>
                  setSubmitTo(v as "email" | "webhook" | "crm-lead")
                }
              >
                <SelectTrigger id="submitTo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="crm-lead">CRM Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="success">Success message</Label>
            <Textarea
              id="success"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="Thank you for submitting!"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createForm.isPending || updateForm.isPending}
            >
              {form ? "Update" : "Create"} form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
