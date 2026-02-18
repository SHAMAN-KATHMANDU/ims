import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export interface ErrorScreenProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

/**
 * Reusable full-screen error card. Use for 401, 404, and generic error boundary.
 */
export function ErrorScreen({
  title,
  description,
  icon,
  actions,
}: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            {icon ?? <ShieldAlert className="h-8 w-8 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {actions && (
          <CardContent className="flex flex-col gap-2">{actions}</CardContent>
        )}
      </Card>
    </div>
  );
}

export function ErrorPage() {
  return (
    <ErrorScreen
      title="Unauthorized Access"
      description="You don't have permission to access this page. Please log in to continue."
      actions={
        <Button asChild className="w-full">
          <Link href="/login">Go to Login</Link>
        </Button>
      }
    />
  );
}
