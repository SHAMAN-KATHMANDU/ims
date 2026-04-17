"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/use-auth";
import { getOrgNameBySlug } from "../services/auth.service";
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
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { LoginSchema, type LoginInput } from "../validation";
import { getForgotPasswordPath } from "@/constants/routes";

/**
 * Login form: username and password. Tenant slug comes from the URL (e.g. /ruby/login)
 * and is passed as a prop; it is sent as X-Tenant-Slug on login.
 */
export function LoginForm({ tenantSlug }: { tenantSlug: string }) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const slug = tenantSlug?.trim().toLowerCase();
    if (!slug) {
      setOrgName(null);
      return;
    }
    getOrgNameBySlug(slug).then(setOrgName);
  }, [tenantSlug]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    const slug = tenantSlug?.trim().toLowerCase();
    if (!slug) {
      setSubmitError("Invalid organization URL. Use your organization's link.");
      return;
    }
    try {
      await login({
        username: data.username,
        password: data.password,
        tenantSlug: slug,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      const isGenericNotFound = message === "The requested item was not found.";
      setSubmitError(
        isGenericNotFound
          ? "Organization not found. Please use your organization's login link (e.g. yourapp.com/yourorg/login)."
          : message,
      );
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {orgName ? `Sign in to ${orgName}` : "Welcome Back"}
        </CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your dashboard
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                disabled={isSubmitting}
                className="pr-10"
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20"
            >
              <strong>Error:</strong> {submitError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>

          {tenantSlug && (
            <div className="text-center">
              <Link
                href={getForgotPasswordPath(tenantSlug)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
