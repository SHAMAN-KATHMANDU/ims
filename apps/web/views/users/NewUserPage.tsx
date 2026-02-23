"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateUserData } from "@/hooks/useUser";
import { useCreateUser } from "@/hooks/useUser";
import { UserForm, type UserFormValues } from "./components/UserForm";
import { type UserRoleType } from "@repo/shared";
import { useIsMobile } from "@/hooks/useMobile";

export function NewUserPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "superadmin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const createMutation = useCreateUser();

  const handleSubmit = useCallback(
    async (data: UserFormValues) => {
      try {
        const createData: CreateUserData = {
          username: data.username,
          password: data.password,
          role: data.role as UserRoleType,
        };
        await createMutation.mutateAsync(createData);
        toast({ title: "User created successfully" });
        router.push(`${basePath}/users`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create user",
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/users`);
  }, [router, basePath]);

  useEffect(() => {
    if (!isMobile) {
      router.replace(`${basePath}/users?add=1`);
    }
  }, [isMobile, router, basePath]);

  if (!isMobile) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/users`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </Button>

      <UserForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        editingUser={null}
        onSubmit={handleSubmit}
        onReset={() => {}}
        inline
      />
    </div>
  );
}
