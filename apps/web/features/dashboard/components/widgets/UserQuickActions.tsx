"use client";

/**
 * User dashboard: Quick actions (New sale, New member). Links only; no API.
 */

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, UserPlus, ArrowRight } from "lucide-react";

export const WIDGET_ID = "user-quick-actions";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "none";
export const REFRESH_BEHAVIOR = "static";

interface UserQuickActionsProps {
  basePath: string;
}

export function UserQuickActions({ basePath }: UserQuickActionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Quick actions</CardTitle>
        <CardDescription>Start a sale or add a member</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="default" size="sm">
          <Link
            href={`${basePath}/sales`}
            className="inline-flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            New sale
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`${basePath}/members`}
            className="inline-flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            New member
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
