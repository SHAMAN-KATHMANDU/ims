"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { getWorkspaceInfo } from "@/services/authService";
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
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Login form: username and password. Tenant slug comes from the URL (e.g. /ruby/login)
 * and is passed as a prop; it is sent as X-Tenant-Slug on login.
 */
export default function LoginForm({
  tenantSlug,
  tenantDisplayName,
}: {
  tenantSlug: string;
  tenantDisplayName?: string;
}) {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [resolvedTenantName, setResolvedTenantName] = useState(
    tenantDisplayName || tenantSlug,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!tenantSlug) return;
    const timeout = setTimeout(async () => {
      const workspace = await getWorkspaceInfo(tenantSlug);
      if (!mounted) return;
      setResolvedTenantName(workspace?.workspace?.name || tenantSlug);
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [tenantSlug]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitError(null);
    const slug = tenantSlug?.trim().toLowerCase();
    if (!slug) {
      setSubmitError("Invalid organization URL. Use your organization's link.");
      return;
    }
    try {
      const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
      await login({
        username: data.username,
        password: data.password,
        tenantSlug: slug,
        callbackUrl,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-xl font-bold leading-tight sm:text-2xl">
          Welcome to Shaman Yaantra {resolvedTenantName}
        </CardTitle>
        <CardDescription className="text-center">Login</CardDescription>
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
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              <strong>Error:</strong> {submitError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
