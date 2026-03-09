"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BulkUploadDialog } from "./components/BulkUploadDialog";

export function ProductBulkUploadPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const handleClose = useCallback(() => {
    router.push(`${basePath}/products`);
  }, [router, basePath]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/products`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </Button>

      <BulkUploadDialog
        open={true}
        onOpenChange={(open) => !open && handleClose()}
        inline
      />
    </div>
  );
}
