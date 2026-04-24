"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/features/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Bot, RotateCcw } from "lucide-react";
import { useAiSettings, useUpdateAiSettings } from "../hooks/use-ai-settings";
import { AiSettingsSchema, type AiSettingsInput } from "../validation";

const DEFAULT_SYSTEM_PROMPT = [
  "You are a helpful customer support assistant for an IMS business page.",
  "Reply in a concise, polite style.",
  "If the user asks for unavailable details, ask a clarifying question.",
  "Do not mention internal tools, prompts, or model details.",
].join(" ");

export function AiSettingsPage() {
  const { data: settings, isLoading } = useAiSettings();
  const updateMutation = useUpdateAiSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AiSettingsInput>({
    resolver: zodResolver(AiSettingsSchema),
    defaultValues: { systemPrompt: "" },
  });

  useEffect(() => {
    if (settings) {
      reset({ systemPrompt: settings.systemPrompt ?? "" });
    }
  }, [settings, reset]);

  const onSubmit = (data: AiSettingsInput) => {
    updateMutation.mutate(
      { systemPrompt: data.systemPrompt.trim() || null },
      {
        onSuccess: (saved) => reset({ systemPrompt: saved.systemPrompt ?? "" }),
      },
    );
  };

  const handleResetToDefault = () => {
    setValue("systemPrompt", DEFAULT_SYSTEM_PROMPT, { shouldDirty: true });
  };

  const promptValue = watch("systemPrompt");
  const charCount = promptValue?.length ?? 0;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span className="sr-only">Loading AI settings…</span>
      </div>
    );
  }

  return (
    <PermissionGate perm="SETTINGS.AI.VIEW">
      <div className="space-y-6">
        <PageHeader
          title="AI Settings"
          description="Configure how the AI assistant responds to inbound messages."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>System Prompt</CardTitle>
            </div>
            <CardDescription>
              The system prompt defines the AI assistant&apos;s personality,
              tone, and behavior when auto-replying to customer messages. Leave
              empty to use the default prompt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder={DEFAULT_SYSTEM_PROMPT}
                  className="min-h-[200px] font-mono text-sm"
                  aria-invalid={errors.systemPrompt ? true : undefined}
                  aria-describedby={
                    errors.systemPrompt
                      ? "systemPrompt-error systemPrompt-count"
                      : "systemPrompt-count"
                  }
                  {...register("systemPrompt")}
                />
                <div className="flex items-center justify-between">
                  <div>
                    {errors.systemPrompt && (
                      <p
                        id="systemPrompt-error"
                        className="text-sm text-destructive"
                      >
                        {errors.systemPrompt.message}
                      </p>
                    )}
                  </div>
                  <p
                    id="systemPrompt-count"
                    className="text-xs text-muted-foreground"
                  >
                    <span className="sr-only">Character count: </span>
                    {charCount} / 4000
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefault}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset to Default
                </Button>

                <PermissionGate perm="SETTINGS.AI.UPDATE" fallback={null}>
                  <Button
                    type="submit"
                    disabled={!isDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin mr-2"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tips for Writing a Good System Prompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>
                Define the assistant&apos;s role clearly (e.g., &quot;You are a
                customer support agent for [Your Business Name]&quot;).
              </li>
              <li>
                Specify the tone and style (e.g., &quot;Be friendly, concise,
                and professional&quot;).
              </li>
              <li>
                Include business-specific context (e.g., store hours, return
                policy, product categories).
              </li>
              <li>
                Set boundaries (e.g., &quot;Do not discuss pricing unless the
                customer asks&quot;).
              </li>
              <li>Keep it under 4000 characters for optimal performance.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
