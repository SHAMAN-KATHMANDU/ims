"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { UpdateUserData } from "@/hooks/useUser";
import { useUser, useUpdateUser } from "@/hooks/useUser";
import { UserForm, type UserFormValues } from "./components/UserForm";
import { type UserRoleType } from "@repo/shared";
import { useIsMobile } from "@/hooks/useMobile";

export function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "superadmin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { data: user, isLoading: loadingUser } = useUser(id);
  const updateMutation = useUpdateUser();

  const handleSubmit = useCallback(
    async (data: UserFormValues) => {
      if (!id) return;
      try {
        const updateData: UpdateUserData = {
          username: data.username,
          role: data.role as UserRoleType,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await updateMutation.mutateAsync({ id, data: updateData });
        toast({ title: "User updated successfully" });
        router.push(`${basePath}/users`);
      } catch (error: unknown) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to update user",
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/users`);
  }, [router, basePath]);

  useEffect(() => {
    if (!isMobile && id) {
      router.replace(`${basePath}/users?edit=${id}`);
    }
  }, [isMobile, id, router, basePath]);

  if (!isMobile) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  if (loadingUser || !user) {
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
        <div className="text-muted-foreground">Loading user...</div>
      </div>
    );
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
        editingUser={user}
        onSubmit={handleSubmit}
        onReset={() => {}}
        inline
      />
    </div>
  );
}
