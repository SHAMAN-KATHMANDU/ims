"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useCreateBundle } from "../hooks/use-bundles";
import type { CreateBundleData } from "../types";
import { BundleForm } from "./BundleForm";

export function NewBundlePage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateBundle();

  const [open, setOpen] = useState(true);

  const handleSubmit = async (data: CreateBundleData) => {
    try {
      const created = await createMutation.mutateAsync(data);
      toast({ title: "Bundle created" });
      router.push(`/${workspace}/products/bundles/${created.id}/edit`);
    } catch (err) {
      toast({
        title: "Failed to create bundle",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/${workspace}/products/bundles`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to bundles
          </Link>
        </Button>
      </div>
      <BundleForm
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) router.push(`/${workspace}/products/bundles`);
        }}
        editingBundle={null}
        onSubmit={handleSubmit}
        onReset={() => {}}
        isLoading={createMutation.isPending}
        inline
      />
    </div>
  );
}
