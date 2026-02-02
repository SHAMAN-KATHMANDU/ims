"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type MemberWithSales } from "@/hooks/useMember";
import { formatCurrency } from "@/lib/format";
import {
  Phone,
  Mail,
  User,
  FileText,
  Calendar,
  ShoppingCart,
} from "lucide-react";

interface MemberDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberWithSales | null;
  isLoading?: boolean;
}

export function MemberDetail({
  open,
  onOpenChange,
  member,
  isLoading,
}: MemberDetailProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Member Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Separator />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : member ? (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">{member.phone}</span>
                </div>
                {member.name && (
                  <p className="text-muted-foreground">{member.name}</p>
                )}
              </div>
              <Badge
                variant={member.isActive ? "default" : "secondary"}
                className={
                  member.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {member.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              {member.email && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p>{member.email}</p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </div>
                <p>{format(new Date(member.createdAt), "MMMM d, yyyy")}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  Total Purchases
                </div>
                <p className="font-medium">{member._count?.sales || 0}</p>
              </div>
            </div>

            {/* Notes */}
            {member.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </div>
                  <p className="text-sm">{member.notes}</p>
                </div>
              </>
            )}

            {/* Sales History */}
            {member.sales && member.sales.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Sales History</h4>
                  <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale Code</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {member.sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {sale.saleCode}
                            </TableCell>
                            <TableCell>{sale.location.name}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Number(sale.total))}
                            </TableCell>
                            <TableCell>
                              {format(new Date(sale.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Member not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
