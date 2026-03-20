"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  ManualWebhookVerifyFormSchema,
  ManualCompleteFormSchema,
  type ManualWebhookVerifyFormValues,
  type ManualCompleteFormValues,
} from "../validation";
import {
  useRegisterManualWebhookVerify,
  useCompleteManualMessagingChannel,
} from "../hooks/use-messaging-channels";

interface ManualConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, open on step 2 to finish a pending channel */
  resumeChannelId?: string | null;
}

export function ManualConnectDialog({
  open,
  onOpenChange,
  resumeChannelId = null,
}: ManualConnectDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [channelId, setChannelId] = useState<string | null>(null);

  const registerVerify = useRegisterManualWebhookVerify();
  const completeConnect = useCompleteManualMessagingChannel();

  const step1Form = useForm<ManualWebhookVerifyFormValues>({
    resolver: zodResolver(ManualWebhookVerifyFormSchema),
    defaultValues: { webhookVerifyToken: "" },
  });

  const step2Form = useForm<ManualCompleteFormValues>({
    resolver: zodResolver(ManualCompleteFormSchema),
    defaultValues: {
      pageId: "",
      pageName: "",
      pageAccessToken: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (resumeChannelId) {
      setStep(2);
      setChannelId(resumeChannelId);
    } else {
      setStep(1);
      setChannelId(null);
      step1Form.reset({ webhookVerifyToken: "" });
      step2Form.reset({ pageId: "", pageName: "", pageAccessToken: "" });
    }
  }, [open, resumeChannelId]);

  const onStep1Submit = step1Form.handleSubmit(async (values) => {
    const channel = await registerVerify.mutateAsync({
      provider: "FACEBOOK_MESSENGER",
      webhookVerifyToken: values.webhookVerifyToken.trim(),
    });
    setChannelId(channel.id);
    setStep(2);
  });

  const onStep2Submit = step2Form.handleSubmit(async (values) => {
    const id = channelId;
    if (!id) return;
    await completeConnect.mutateAsync({
      channelId: id,
      payload: {
        pageId: values.pageId.trim(),
        pageName: values.pageName.trim(),
        pageAccessToken: values.pageAccessToken.trim(),
      },
    });
    step1Form.reset();
    step2Form.reset();
    setStep(1);
    setChannelId(null);
    onOpenChange(false);
  });

  const busy =
    registerVerify.isPending ||
    completeConnect.isPending ||
    step1Form.formState.isSubmitting ||
    step2Form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Messenger (local dev)</DialogTitle>
          <DialogDescription>
            {step === 1 ? (
              <>
                <strong>Step 1:</strong> Save your verify token here first, then
                use the same value in Meta&apos;s webhook settings and click
                &quot;Verify and save&quot;.
              </>
            ) : (
              <>
                <strong>Step 2:</strong> After Meta confirms webhook verification,
                enter your Page ID, name, and page access token to subscribe and
                activate the channel.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Webhook callback URL</p>
          <p className="mt-1">
            <code className="break-all">
              https://&#123;your-ngrok-host&#125;/api/v1/webhooks/messenger
            </code>
          </p>
          <p className="mt-2">
            Run <code className="rounded bg-muted px-1">ngrok http 4000</code>{" "}
            (or your API port) and paste the HTTPS host above.
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={onStep1Submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-connect-verify-token">Verify token</Label>
              <Input
                id="manual-connect-verify-token"
                autoComplete="off"
                aria-invalid={!!step1Form.formState.errors.webhookVerifyToken}
                aria-describedby={
                  step1Form.formState.errors.webhookVerifyToken
                    ? "manual-connect-verify-token-error"
                    : undefined
                }
                {...step1Form.register("webhookVerifyToken")}
              />
              {step1Form.formState.errors.webhookVerifyToken && (
                <p
                  id="manual-connect-verify-token-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {step1Form.formState.errors.webhookVerifyToken.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Pick a secret string (max 255 characters). Use the exact same
                value in Meta&apos;s webhook verify token field after saving
                here.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {registerVerify.isPending ? "Saving…" : "Save verify token"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={onStep2Submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-connect-page-id">Page ID</Label>
              <Input
                id="manual-connect-page-id"
                autoComplete="off"
                aria-invalid={!!step2Form.formState.errors.pageId}
                aria-describedby={
                  step2Form.formState.errors.pageId
                    ? "manual-connect-page-id-error"
                    : undefined
                }
                {...step2Form.register("pageId")}
              />
              {step2Form.formState.errors.pageId && (
                <p
                  id="manual-connect-page-id-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {step2Form.formState.errors.pageId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-connect-page-name">Page name</Label>
              <Input
                id="manual-connect-page-name"
                autoComplete="off"
                aria-invalid={!!step2Form.formState.errors.pageName}
                aria-describedby={
                  step2Form.formState.errors.pageName
                    ? "manual-connect-page-name-error"
                    : undefined
                }
                {...step2Form.register("pageName")}
              />
              {step2Form.formState.errors.pageName && (
                <p
                  id="manual-connect-page-name-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {step2Form.formState.errors.pageName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-connect-page-token">Page access token</Label>
              <Input
                id="manual-connect-page-token"
                type="password"
                autoComplete="off"
                aria-invalid={!!step2Form.formState.errors.pageAccessToken}
                aria-describedby={
                  step2Form.formState.errors.pageAccessToken
                    ? "manual-connect-page-token-error"
                    : undefined
                }
                {...step2Form.register("pageAccessToken")}
              />
              {step2Form.formState.errors.pageAccessToken && (
                <p
                  id="manual-connect-page-token-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {step2Form.formState.errors.pageAccessToken.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                From Meta Developer → Messenger → Access tokens (generate for your
                page).
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !channelId}>
                {completeConnect.isPending ? "Connecting…" : "Connect channel"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
