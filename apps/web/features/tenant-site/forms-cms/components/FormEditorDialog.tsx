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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/useToast";
import { useFormsStore } from "../store";
import type { Form, FormField } from "../types";

interface FormEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Form | null;
}

export function FormEditorDialog({
  open,
  onOpenChange,
  form,
}: FormEditorDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [destination, setDestination] = useState<"email" | "webhook">("email");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (form) {
      setName(form.name);
      setFields(form.fields);
      setDestination(form.submissionDestination);
      setSuccessMessage(form.successMessage);
    } else {
      setName("");
      setFields([]);
      setDestination("email");
      setSuccessMessage("");
    }
  }, [form]);

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: "New field",
      type: "text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }

    const addForm = useFormsStore.getState().addForm;
    addForm({
      id: `form-${Date.now()}`,
      name,
      submissions: 0,
      lastSubmission: "just now",
      status: "active",
      fields,
      submissionDestination: destination,
      successMessage: successMessage || "Thank you!",
    });

    toast({ title: "Form created" });
    onOpenChange(false);
    setName("");
    setFields([]);
    setDestination("email");
    setSuccessMessage("");
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
          <div className="space-y-2">
            <Label htmlFor="name">Form name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contact form"
            />
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

            {fields.map((field) => (
              <div
                key={field.id}
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
                        handleUpdateField(field.id, { label: e.target.value })
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
                      value={field.type}
                      onValueChange={(value: any) =>
                        handleUpdateField(field.id, { type: value })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        handleUpdateField(field.id, {
                          required: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">Required</span>
                  </label>
                  <button
                    onClick={() => handleRemoveField(field.id)}
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
              <Label htmlFor="destination">Send submissions to</Label>
              <Select
                value={destination}
                onValueChange={(v: any) => setDestination(v)}
              >
                <SelectTrigger id="destination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
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
            <Button onClick={handleSave}>
              {form ? "Update" : "Create"} form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
