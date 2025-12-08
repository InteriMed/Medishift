"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { SceneStatus } from "@/types/storyboard";
import { cn } from "@/lib/utils";

interface SceneStatusBadgeProps {
  status: SceneStatus;
  className?: string;
}

export function SceneStatusBadge({ status, className }: SceneStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: "Pending",
      icon: Clock,
      variant: "outline" as const,
      className: "text-muted-foreground"
    },
    loading: {
      label: "Generating",
      icon: Loader2,
      variant: "secondary" as const,
      className: "text-primary animate-spin"
    },
    generated: {
      label: "Generated",
      icon: CheckCircle2,
      variant: "default" as const,
      className: "text-green-600 dark:text-green-400"
    },
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      variant: "default" as const,
      className: "text-green-600 dark:text-green-400"
    },
    error: {
      label: "Error",
      icon: XCircle,
      variant: "destructive" as const,
      className: "text-destructive"
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn("flex items-center gap-1.5", config.className, className)}
    >
      <Icon className={cn("h-3 w-3", status === "loading" && "animate-spin")} />
      <span>{config.label}</span>
    </Badge>
  );
}

