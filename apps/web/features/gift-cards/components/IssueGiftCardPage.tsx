"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useCreateGiftCard } from "../hooks/use-gift-cards";
import type { CreateGiftCardData } from "../types";
import { IssueGiftCardForm } from "./IssueGiftCardForm";

export function IssueGiftCardPage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateGiftCard();

  const handleSubmit = async (data: CreateGiftCardData) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Gift card issued" });
      router.push(`/${workspace}/gift-cards`);
    } catch (err) {
      toast({
        title: "Failed to issue gift card",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/${workspace}/gift-cards`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to gift cards
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Issue gift card</h1>
        <p className="text-sm text-muted-foreground">
          Generate a code, set the amount, and optionally tie the card to a
          recipient or expiry.
        </p>
      </div>
      <IssueGiftCardForm
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
        onCancel={() => router.push(`/${workspace}/gift-cards`)}
      />
    </div>
  );
}
