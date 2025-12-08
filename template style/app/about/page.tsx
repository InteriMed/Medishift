'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Lock,
  Code,
  ArrowRight,
  CheckCircle,
  Globe,
  Scale,
  Server,
  FileCheck
} from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Security First',
    description:
      "We operate with a zero-retention architecture. Your code is analyzed in ephemeral environments and never stored.",
  },
  {
    icon: Code,
    title: 'Developer Experience',
    description:
      'Compliance shouldn\'t slow you down. We build tools that integrate seamlessly into your existing CI/CD workflows.',
  },
  {
    icon: Scale,
    title: 'Regulatory Expertise',
    description:
      "We translate complex EU regulations into executable code checks, ensuring you stay compliant without being a lawyer.",
  },
  {
    icon: Globe,
    title: 'Sovereignty',
    description:
      "Data residency matters. Our infrastructure is hosted entirely in Switzerland, ensuring maximum privacy and neutrality.",
  },
];

const milestones = [
  {
    year: '2023 Q4',
    title: 'The Inception',
    description:
      'AuditOps was founded to bridge the gap between rapid AI development and emerging EU regulations.',
  },
  {
    year: '2024 Q2',
    title: 'The Inspector Engine',
    description:
      'Launched our core static analysis engine, capable of detecting high-risk AI libraries and patterns.',
  },
  {
    year: '2024 Q4',
    title: 'EU AI Act Enforcement',
    description:
      'Aligned our risk classification models with the final text of the EU AI Act.',
  },
  {
    year: '2025 Q1',
    title: 'Enterprise Launch',
    description:
      'Released the full AuditOps platform with GitHub App integration and automated PDF reporting.',
  },
];

const stats = [
  { number: '1M+', label: 'Lines of Code Scanned' },
  { number: '50+', label: 'Enterprise Clients' },
  { number: '100%', label: 'Swiss Hosted' },
  { number: '24/7', label: 'Compliance Monitoring' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      {/* HERO SECTION */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="fixed inset-0 bg-swiss-cross opacity-30 pointer-events-none" />

        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
              Building the
              <br />
              <span className="text-primary">Trust Layer for AI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              We empower enterprises to deploy AI with confidence.
              By automating compliance, we turn regulatory hurdles into a competitive advantage.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" className="h-14 px-8 text-lg rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" asChild>
                <Link href="/dashboard/create">
                  Start Free Audit
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-md border-border bg-background hover:bg-muted/50" asChild>
                <Link href="/contact">
                  Contact Sales
                </Link>
              </Button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-border/40 pt-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {stat.number}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MISSION SECTION */}
      <section className="py-24 bg-secondary/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                The EU AI Act is the most comprehensive AI regulation in the world. For many companies, it represents a massive barrier to innovation.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Our mission is to democratize compliance. We believe that safe AI should be accessible to everyone, not just tech giants with armies of lawyers. By automating the technical analysis and legal mapping, we let developers focus on building, while we handle the red tape.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm font-medium text-primary">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Automated Analysis
                </div>
                <div className="flex items-center text-sm font-medium text-primary">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Legal Mapping
                </div>
                <div className="flex items-center text-sm font-medium text-primary">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Audit Ready
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/10 border border-primary/20 flex items-center justify-center p-12">
                <div className="text-center space-y-6">
                  <Shield className="w-24 h-24 text-primary mx-auto opacity-80" />
                  <div className="space-y-2">
                    <div className="h-2 bg-primary/20 rounded-full w-32 mx-auto" />
                    <div className="h-2 bg-primary/20 rounded-full w-24 mx-auto" />
                    <div className="h-2 bg-primary/20 rounded-full w-40 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Core Principles
            </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The foundation of our platform and our promise to you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section className="py-24 bg-secondary/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Journey
            </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From concept to the leading AI compliance platform.
              </p>
            </div>

            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-6 group"
                >
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center z-10 relative group-hover:border-primary transition-colors">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                    </div>
                    {index !== milestones.length - 1 && (
                      <div className="absolute top-12 left-6 w-px h-full bg-border -ml-px" />
                    )}
                  </div>
                  <div className="flex-1 pt-2 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="w-fit border-primary/30 text-primary"
                      >
                        {milestone.year}
                      </Badge>
                      <h3 className="text-xl font-semibold">
                        {milestone.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to secure your AI?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join the compliance revolution.
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                asChild
              >
                <Link href="/dashboard/create">
                  Start Free Audit
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-md border-border bg-background hover:bg-muted/50"
                asChild
              >
                <Link href="/contact">
                  Contact Sales
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
