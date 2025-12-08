"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLoading } from "@/contexts/loading-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/auth/login"
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only redirect after we've completed the initial auth check
    if (!loading && hasCheckedAuth && !isAuthenticated) {
      // Store the intended destination
      const currentPath = window.location.pathname;
      if (currentPath !== redirectTo) {
        sessionStorage.setItem("redirect_after_login", currentPath);
      }
      router.push(redirectTo);
    }
  }, [isAuthenticated, loading, hasCheckedAuth, router, redirectTo]);

  useEffect(() => {
    // Mark that we've completed the initial auth check
    if (!loading) {
      setHasCheckedAuth(true);
    }
  }, [loading]);

  useEffect(() => {
    if (loading || !hasCheckedAuth) {
      return;
    } else {
      stopLoading();
    }
  }, [loading, hasCheckedAuth, stopLoading]);

  if (loading || !hasCheckedAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

