"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MemberBulkUploadDialog } from "./MemberBulkUploadDialog";

export function MembersBulkUploadPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const handleClose = useCallback(() => {
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

      <MemberBulkUploadDialog
        open={true}
        onOpenChange={(open) => !open && handleClose()}
        inline
      />
    </div>
  );
}
