"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 border-2 border-primary">
          <div className="text-6xl font-bold text-primary">S</div>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          SHAMAN Kathmandu
        </h1>

        {/* Login Button */}
        <Link href="/login" className="mt-4">
          <Button size="lg" className="px-8 py-6 text-lg font-semibold">
            Login to the system
          </Button>
        </Link>
      </div>
    </main>
  );
}
