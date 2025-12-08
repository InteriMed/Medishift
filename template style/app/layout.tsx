import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { ErrorBoundaryWrapper } from '@/components/error-boundary-wrapper';

export const metadata: Metadata = {
  title: 'AuditOps - Institutional Grade AI Compliance',
  description:
    'Automated Annex IV Compliance and Risk Analysis for EU AI Act. Institutional grade infrastructure for banks and enterprises.',
  keywords:
    'EU AI Act, Annex IV, AI Compliance, Risk Analysis, AuditOps, RegTech, AI Governance, Automated Compliance, Institutional Grade AI',
  authors: [{ name: 'AuditOps Team' }],
  creator: 'AuditOps',
  publisher: 'AuditOps',
  applicationName: 'AuditOps',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://auditops.ai'),
  alternates: {
    canonical: 'https://auditops.ai',
  },
  openGraph: {
    title: 'AuditOps - Institutional Grade AI Compliance',
    description:
      'Automated Annex IV Compliance and Risk Analysis for EU AI Act. Institutional grade infrastructure for banks and enterprises.',
    url: 'https://auditops.ai',
    siteName: 'AuditOps',
    images: [
      {
        url: 'https://auditops.ai/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AuditOps - AI Compliance Platform',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
    type: 'website',
    countryName: 'Switzerland',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuditOps - Institutional Grade AI Compliance',
    description:
      'Automated Annex IV Compliance and Risk Analysis for EU AI Act.',
    images: ['https://auditops.ai/og-image.jpg'],
    creator: '@auditops',
    site: '@auditops',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'Technology',
  classification: 'RegTech Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="AuditOps" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ErrorBoundaryWrapper>
          <Providers>{children}</Providers>
        </ErrorBoundaryWrapper>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AuditOps',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              description:
                'Automated Annex IV Compliance and Risk Analysis for EU AI Act.',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                ratingCount: '50',
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
