"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateMemberData, UpdateMemberData } from "../hooks/use-members";
import { useCreateMember } from "../hooks/use-members";
import { MemberForm } from "./MemberForm";

export function NewMemberPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const createMutation = useCreateMember();

  const handleSubmit = useCallback(
    async (data: CreateMemberData | UpdateMemberData) => {
      try {
        await createMutation.mutateAsync(data as CreateMemberData);
        toast({ title: "Member created successfully" });
        router.push(`${basePath}/members`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create member";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [createMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/members`);
  }, [router, basePath]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/members`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to members
        </Link>
      </Button>

      <MemberForm
        open={true}
        onOpenChange={(open) => !open && handleCancel()}
        member={null}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
        inline
      />
    </div>
  );
}
