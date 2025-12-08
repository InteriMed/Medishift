'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { LoadingProvider } from '@/contexts/loading-context';
import { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoadingProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-background bg-swiss-cross text-foreground font-sans antialiased">
          <Sidebar />
          <main className="lg:pl-64 min-h-screen">
            <div className="container mx-auto p-8">
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    </LoadingProvider>
  );
}

