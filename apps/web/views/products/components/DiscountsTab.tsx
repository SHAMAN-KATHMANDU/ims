"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/hooks/useProduct";

interface DiscountsTabProps {
  products: Product[];
}

type DiscountWithProductName = NonNullable<Product["discounts"]>[0] & {
  productName: string;
  productId: string;
};

export function DiscountsTab({ products }: DiscountsTabProps) {
  // Helper to get all discounts from all products for display
  const allDiscounts: DiscountWithProductName[] = products.flatMap(
    (product: Product) =>
      (product.discounts || []).map((d) => ({
        ...d,
        productName: product.name,
        productId: product.id,
      })),
  );

  const specialDiscounts = allDiscounts.filter(
    (d) => d.discountType?.name?.toLowerCase() === "special" && d.isActive,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Special Discounts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Showing only special discounts. Edit a product to add or modify
            discounts.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Special Discounts</CardTitle>
          <CardDescription>
            Showing only special discounts from all products. To add/edit
            discounts, edit the product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Discount Type</TableHead>
                <TableHead>Discount %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specialDiscounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No special discounts found.
                  </TableCell>
                </TableRow>
              ) : (
                specialDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">
                      {discount.productName}
                    </TableCell>
                    <TableCell>
                      {discount.discountType?.name || "Unknown"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {discount.discountPercentage}%
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          discount.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {discount.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {discount.startDate
                        ? new Date(discount.startDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {discount.endDate
                        ? new Date(discount.endDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
