"use client";

import { Lock } from "lucide-react";

interface ProTierBadgeProps {
  className?: string;
}

export function ProTierBadge({ className = "" }: ProTierBadgeProps) {
  return (
    <Lock className={`w-3.5 h-3.5 ${className}`} style={{ color: 'rgb(236, 72, 153)' }} />
  );
}

