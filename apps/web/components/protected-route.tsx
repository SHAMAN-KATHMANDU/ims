"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthToken,
  getCurrentUser,
  getAuthUser,
  setAuthUser,
} from "@/utils/auth";
import { LoadingPage } from "./loading-page";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = getAuthToken();

      if (!token) {
        router.push("/login");
        return;
      }

      // Verify token and get user info
      let user = getAuthUser();

      // If no user in localStorage, fetch from API
      if (!user) {
        user = await getCurrentUser();
        if (user) {
          setAuthUser(user);
        } else {
          // Token is invalid, clear it and redirect
          router.push("/login");
          return;
        }
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuthentication();
  }, [router]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
