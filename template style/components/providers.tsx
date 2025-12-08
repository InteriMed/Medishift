'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/auth-context';
import { CreditsProvider } from '@/contexts/credits-context';
import { PricingProvider } from '@/contexts/pricing-context';
import { LoadingProvider } from '@/contexts/loading-context';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <CreditsProvider>
            <PricingProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </PricingProvider>
          </CreditsProvider>
        </AuthProvider>
      </LoadingProvider>
      <Toaster />
    </ThemeProvider>
  );
}
