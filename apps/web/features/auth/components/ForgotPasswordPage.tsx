"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "../services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordSchema, type ForgotPasswordInput } from "../validation";
import { getLoginPath } from "@/constants/routes";
import { ArrowLeft } from "lucide-react";

export function ForgotPasswordPage({ tenantSlug }: { tenantSlug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { username: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setSubmitError(null);
    const slug = tenantSlug?.trim().toLowerCase();
    if (!slug) {
      setSubmitError("Invalid organization URL. Use your organization's link.");
      return;
    }
    try {
      await requestPasswordReset(data.username, slug);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Request failed. Please try again.",
      );
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Request Submitted
          </CardTitle>
          <CardDescription className="text-center">
            If an account exists with that username, a password reset request
            has been submitted. Contact your administrator to complete the
            reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={getLoginPath(tenantSlug)}>
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-center">
          Enter your username. Your administrator will process the reset
          request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              disabled={isSubmitting}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {submitError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>

          <div className="text-center">
            <Link
              href={getLoginPath(tenantSlug)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
