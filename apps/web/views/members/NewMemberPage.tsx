"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { CreateMemberData, UpdateMemberData } from "@/hooks/useMember";
import { useCreateMember } from "@/hooks/useMember";
import { MemberForm } from "./components/MemberForm";
import { useIsMobile } from "@/hooks/useMobile";

export function NewMemberPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const isMobile = useIsMobile();
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

  useEffect(() => {
    if (!isMobile) {
      router.replace(`${basePath}/members?add=1`);
    }
  }, [isMobile, router, basePath]);

  if (!isMobile) {
    return <div className="p-6 text-muted-foreground">Redirecting...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/members`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
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
