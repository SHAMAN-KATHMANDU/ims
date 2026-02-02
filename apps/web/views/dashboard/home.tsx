"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore, selectUserRole } from "@/stores/auth-store";
import { useSalesSummary, formatCurrency } from "@/hooks/useSales";
import {
  BarChart3,
  Receipt,
  Package,
  Users,
  FileText,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { startOfDay, endOfDay, format } from "date-fns";

export function HomePage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const base = `/${workspace}`;
  const userRole = useAuthStore(selectUserRole);
  const today = new Date();
  const todayStart = format(startOfDay(today), "yyyy-MM-dd");
  const todayEnd = format(endOfDay(today), "yyyy-MM-dd");

  const { data: summary, isLoading: summaryLoading } = useSalesSummary({
    startDate: todayStart,
    endDate: todayEnd,
  });

  if (!userRole) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">
          {userRole === "user"
            ? "Dashboard"
            : userRole === "admin"
              ? "Admin Dashboard"
              : "Super Admin Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {userRole === "user"
            ? "Your overview and quick links"
            : "Overview of sales, inventory, and reports"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's sales – all roles */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Sales
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalRevenue ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.totalSales ?? 0} sale(s) today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* User: User Sales Report link */}
        {userRole === "user" && (
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                My Sales Report
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Sales since your last login
              </p>
              <Link
                href={`${base}/sales/user-report`}
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                View report
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Admin / Super Admin: Reports link */}
        {(userRole === "admin" || userRole === "superAdmin") && (
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Inventory, finance, and analytics
              </p>
              <Link
                href={`${base}/reports/analytics`}
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                View reports
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Admin / Super Admin: Sales & Inventory */}
        {(userRole === "admin" || userRole === "superAdmin") && (
          <>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage and view all sales
                </p>
                <Link
                  href={`${base}/sales`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Go to Sales
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inventory
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Products, locations, vendors, transfers
                </p>
                <Link
                  href={`${base}/locations`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Manage inventory
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </>
        )}

        {/* Super Admin only: User Management & Logs */}
        {userRole === "superAdmin" && (
          <>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  User Management
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage users and roles
                </p>
                <Link
                  href={`${base}/users`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Users
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  User Logs
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Audit log – logins and actions
                </p>
                <Link
                  href={`${base}/settings/logs`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  View logs
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
