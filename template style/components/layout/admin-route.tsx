"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ClipizyLoading } from "@/components/ui/clipizy-loading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AdminRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AdminRoute({
  children,
  redirectTo = "/dashboard"
}: AdminRouteProps) {
  return <>{children}</>;
}
