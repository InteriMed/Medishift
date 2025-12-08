'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Shield,
  Zap,
  Building,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    description: 'Perfect for testing compliance on a single repository.',
    features: [
      '1 Repository Scan',
      'Basic Risk Analysis',
      'Community Support',
      'Public Repos Only'
    ],
    cta: 'Start Free Audit',
    href: '/dashboard/create',
    variant: 'outline',
    popular: false
  },
  {
    name: 'Pro',
    price: '$499',
    period: '/month',
    description: 'Automated compliance for growing AI teams.',
    features: [
      'Unlimited Repository Scans',
      'Full Annex IV PDF Reports',
      'GitHub App Integration',
      'CI/CD Blocking Rules',
      'Email Support',
      'Private Repos'
    ],
    cta: 'Start Pro Trial',
    href: '/dashboard/create?plan=pro',
    variant: 'default',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Full governance and security for regulated industries.',
    features: [
      'Everything in Pro',
      'SSO (SAML/OIDC)',
      'VPC / On-Premise Deployment',
      'Custom SLAs',
      'Dedicated Account Manager',
      'Audit Logs & RBAC'
    ],
    cta: 'Contact Sales',
    href: '/contact',
    variant: 'outline',
    popular: false
  }
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-swiss-cross opacity-40 pointer-events-none" />

      <section className="relative py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/20 text-primary bg-primary/5 rounded-full">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
              Compliance that scales
              <br />
              <span className="text-primary">with your risk</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Transparent pricing for teams of all sizes. No hidden fees for compliance.
            </p>

            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-12 h-6 rounded-full bg-primary/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span
                  className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-primary transition-transform duration-200 ${isAnnual ? 'translate-x-6' : ''}`}
                />
              </button>
              <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Yearly <span className="text-primary text-xs ml-1">(Save 20%)</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary shadow-lg scale-105 z-10' : 'border-border hover:border-primary/50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm h-10">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>

                <Button
                  className="w-full mb-8"
                  variant={plan.variant as any}
                  size="lg"
                  asChild
                >
                  <Link href={plan.href}>
                    {plan.cta}
                  </Link>
                </Button>

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                </div>
              ))}
            </div>

            <div className="mt-24 text-center">
            <p className="text-muted-foreground mb-4">
              Have questions about enterprise deployment?
            </p>
            <Link href="/contact" className="text-primary font-medium hover:underline inline-flex items-center">
              Contact our sales team <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section Placeholder */}
      <section className="py-24 bg-secondary/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                What is a "Repository Scan"?
              </h3>
              <p className="text-muted-foreground">
                A scan involves analyzing your codebase for high-risk AI libraries, datasets, and patterns. We generate a compliance report based on the findings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Is my code stored?
              </h3>
              <p className="text-muted-foreground">
                No. We use a zero-retention architecture. Your code is cloned into an ephemeral environment, analyzed, and immediately deleted.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Do you support on-premise GitHub Enterprise?
              </h3>
              <p className="text-muted-foreground">
                Yes, our Enterprise plan supports self-hosted GitHub Enterprise Server and GitLab instances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
