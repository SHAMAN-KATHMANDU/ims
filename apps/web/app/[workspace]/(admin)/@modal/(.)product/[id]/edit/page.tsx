"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Intercepting route: when navigating from product list to /product/[id]/edit,
 * this renders in a modal overlay. Direct URL or refresh shows the full page.
 *
 * Pilot: modal shows quick actions. Full ProductForm integration can be added later.
 */
export default function ProductEditModalPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const id = params?.id as string;

  const handleClose = () => {
    router.back();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={handleClose}
        onEscapeKeyDown={handleClose}
      >
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <p className="text-muted-foreground text-sm">
            Product ID: {id}. Choose how to edit.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/${workspace}/product?edit=${id}`}>
                Edit in dialog
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/${workspace}/product/${id}/edit`}>
                Full edit page
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
