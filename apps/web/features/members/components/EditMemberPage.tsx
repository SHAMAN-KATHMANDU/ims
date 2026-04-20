"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { UpdateMemberData } from "../hooks/use-members";
import { useMember, useUpdateMember } from "../hooks/use-members";
import { MemberForm } from "./components/MemberForm";

export function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const { data: member, isLoading: loadingMember } = useMember(id);
  const updateMutation = useUpdateMember();

  const handleSubmit = useCallback(
    async (data: UpdateMemberData) => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({ id, data });
        toast({ title: "Member updated successfully" });
        router.push(`${basePath}/members`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update member";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/members`);
  }, [router, basePath]);

  if (loadingMember || !member) {
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
        <div className="text-muted-foreground">Loading member...</div>
      </div>
    );
  }

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
        member={member}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        inline
      />
    </div>
  );
}
