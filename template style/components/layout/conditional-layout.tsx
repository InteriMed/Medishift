'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import { AnalyticsProvider } from '@/components/analytics/analytics-provider';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering conditional content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = pathname.startsWith('/auth');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');

  // During SSR and first render, always render with Navigation/Footer to prevent hydration mismatch
  if (!mounted) {
    return <AnalyticsProvider>{children}</AnalyticsProvider>;
  }

  // After mounting, conditionally render based on pathname
  if (isAuthPage || isDashboardPage || isAdminPage) {
    return <AnalyticsProvider>{children}</AnalyticsProvider>;
  }

  return (
    <AnalyticsProvider>
      <Navigation />
      <main>{children}</main>
      <Footer />
    </AnalyticsProvider>
  );
}
