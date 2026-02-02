"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventorySummary } from "@/hooks/useInventory";
import { Package, ArrowRight, Warehouse } from "lucide-react";

export function InventoryReportPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const base = `/${workspace}`;
  const { data, isLoading } = useInventorySummary();

  const summary = data?.summary;
  const locationStats = data?.locationStats ?? [];

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-balance">Inventory Report</h1>
        <p className="text-muted-foreground mt-2">
          Stock report and product movement across locations
        </p>
      </div>

      {/* Stock report – summary by location */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock report
          </CardTitle>
          <CardDescription>
            Total items and quantity per location (low stock and out of stock
            can be reviewed per location)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {summary && (
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Total locations
                    </p>
                    <p className="text-2xl font-bold">{summary.totalLocations}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Total SKUs (items)
                    </p>
                    <p className="text-2xl font-bold">{summary.totalItems}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Total quantity
                    </p>
                    <p className="text-2xl font-bold">
                      {summary.totalQuantity}
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">By location</p>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Location</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-right p-3 font-medium">Items</th>
                        <th className="text-right p-3 font-medium">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationStats.map((loc) => (
                        <tr key={loc.id} className="border-b last:border-0">
                          <td className="p-3">{loc.name}</td>
                          <td className="p-3 capitalize">{loc.type.toLowerCase()}</td>
                          <td className="p-3 text-right">{loc.totalItems}</td>
                          <td className="p-3 text-right">
                            {loc.totalQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Product movement – link to transfers */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Product movement
          </CardTitle>
          <CardDescription>
            Transfers and sales drive inventory in/out. View transfers to see
            movement between locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`${base}/transfers`}
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            View transfers
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
