"use client";

import { useAnalytics } from '@/hooks/analytics/use-analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}


