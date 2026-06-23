"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TestCredentialFormSchema,
  AddCredentialFormSchema,
  type TestCredentialFormValues,
  type AddCredentialFormValues,
} from "../validation";
import {
  useTestCredential,
  useAddCredential,
} from "../hooks/use-meta-integration";
import type { TokenValidationResult } from "../types";

interface AddCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "PAGE" | "ADS" | null;
}

export function AddCredentialDialog({
  open,
  onOpenChange,
  kind,
}: AddCredentialDialogProps) {
  const [step, setStep] = useState<"test" | "save">("test");
  const [testResult, setTestResult] = useState<TokenValidationResult | null>(
    null,
  );
  const [testError, setTestError] = useState<string | null>(null);

  const testCredential = useTestCredential();
  const addCredential = useAddCredential();

  const testForm = useForm<TestCredentialFormValues>({
    resolver: zodResolver(TestCredentialFormSchema),
    defaultValues: {
      kind: kind ?? "PAGE",
      accessToken: "",
      appSecret: "",
    },
  });

  const saveForm = useForm<AddCredentialFormValues>({
    resolver: zodResolver(AddCredentialFormSchema),
    defaultValues: {
      kind: kind ?? "PAGE",
      externalId: "",
      name: "",
      accessToken: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setStep("test");
      setTestResult(null);
      setTestError(null);
      testForm.reset({ kind: kind ?? "PAGE", accessToken: "", appSecret: "" });
      saveForm.reset({
        kind: kind ?? "PAGE",
        externalId: "",
        name: "",
        accessToken: "",
      });
    }
  }, [open, kind, testForm, saveForm]);

  const onTestSubmit = testForm.handleSubmit(async (values) => {
    setTestError(null);
    try {
      const result = await testCredential.mutateAsync({
        kind: values.kind,
        accessToken: values.accessToken.trim(),
        appSecret: values.appSecret?.trim(),
      });
      setTestResult(result);
      // Pre-fill save form with data from test result
      if (result.kind === "PAGE" && result.page) {
        saveForm.setValue("externalId", result.page.id);
        saveForm.setValue("name", result.page.name || "Page");
      } else if (
        result.kind === "ADS" &&
        result.adAccounts &&
        result.adAccounts[0]
      ) {
        saveForm.setValue(
          "externalId",
          result.adAccounts[0].account_id || result.adAccounts[0].id,
        );
        saveForm.setValue("name", result.adAccounts[0].name || "Ad Account");
      }
      saveForm.setValue("accessToken", values.accessToken);
      saveForm.setValue("kind", values.kind);
      setStep("save");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to validate credential";
      setTestError(message);
    }
  });

  const onSaveSubmit = saveForm.handleSubmit(async (values) => {
    try {
      await addCredential.mutateAsync({
        kind: values.kind,
        externalId: values.externalId.trim(),
        name: values.name.trim(),
        accessToken: values.accessToken.trim(),
      });
      onOpenChange(false);
    } catch {
      // Error is handled by global toast
    }
  });

  const busy =
    testCredential.isPending ||
    addCredential.isPending ||
    testForm.formState.isSubmitting ||
    saveForm.formState.isSubmitting;

  const kindLabel = kind === "PAGE" ? "Page" : "Ad Account";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {kindLabel}</DialogTitle>
          <DialogDescription>
            {step === "test"
              ? `Test your ${kindLabel.toLowerCase()} access token before saving`
              : `Configure your ${kindLabel.toLowerCase()} details`}
          </DialogDescription>
        </DialogHeader>

        {step === "test" ? (
          // Test Credential Step
          <form onSubmit={onTestSubmit} className="space-y-4">
            {testError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="test-access-token">Access token</Label>
              <Input
                id="test-access-token"
                type="password"
                placeholder="Your Meta access token"
                autoComplete="off"
                disabled={busy}
                {...testForm.register("accessToken")}
              />
              {testForm.formState.errors.accessToken && (
                <p role="alert" className="text-sm text-destructive">
                  {testForm.formState.errors.accessToken.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {kind === "PAGE"
                  ? "From Meta Developer → Messenger → Access tokens"
                  : "From Meta Ads Manager → Settings → Ad accounts"}
              </p>
            </div>

            {kind === "ADS" && (
              <div className="space-y-2">
                <Label htmlFor="test-app-secret">App Secret (optional)</Label>
                <Input
                  id="test-app-secret"
                  type="password"
                  placeholder="Your Facebook App Secret"
                  autoComplete="off"
                  disabled={busy}
                  {...testForm.register("appSecret")}
                />
                {testForm.formState.errors.appSecret && (
                  <p role="alert" className="text-sm text-destructive">
                    {testForm.formState.errors.appSecret.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required if your app has appsecret_proof enabled.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {testCredential.isPending ? "Testing…" : "Test connection"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // Save Credential Step
          <form onSubmit={onSaveSubmit} className="space-y-4">
            {testResult && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {kind === "PAGE"
                    ? `Page "${testResult.page?.name || "Unknown"}" validated`
                    : `${testResult.adAccounts?.length || 0} ad account(s) found`}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="save-external-id">
                {kind === "PAGE" ? "Page" : "Ad Account"} ID
              </Label>
              <Input
                id="save-external-id"
                type="text"
                placeholder={
                  kind === "PAGE" ? "e.g., 12345678901234" : "e.g., 123456789"
                }
                autoComplete="off"
                disabled={busy}
                {...saveForm.register("externalId")}
              />
              {saveForm.formState.errors.externalId && (
                <p role="alert" className="text-sm text-destructive">
                  {saveForm.formState.errors.externalId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-name">Name</Label>
              <Input
                id="save-name"
                type="text"
                placeholder={
                  kind === "PAGE" ? "e.g., My Page" : "e.g., My Ad Account"
                }
                autoComplete="off"
                disabled={busy}
                {...saveForm.register("name")}
              />
              {saveForm.formState.errors.name && (
                <p role="alert" className="text-sm text-destructive">
                  {saveForm.formState.errors.name.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                A friendly label for your reference.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-access-token">Access token</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="save-access-token"
                  type="password"
                  placeholder="Your Meta access token"
                  autoComplete="off"
                  disabled={true}
                  className="bg-muted"
                  {...saveForm.register("accessToken")}
                />
                <Badge variant="default" className="bg-green-600">
                  Set
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Token from the test step will be encrypted and saved.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("test")}
                disabled={busy}
              >
                Back
              </Button>
              <Button type="submit" disabled={busy}>
                {addCredential.isPending ? "Saving…" : "Save credential"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
