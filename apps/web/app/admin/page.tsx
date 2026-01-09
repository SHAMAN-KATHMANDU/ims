"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, ArrowRight } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Access the admin dashboard to manage your admin controls and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/dashboard" className="block">
            <Button size="lg" className="w-full gap-2">
              <LogIn className="h-5 w-5" />
                Go to Admin Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}