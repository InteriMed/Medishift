"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  className?: string;
}

export function CTASection({
  title = "Ready to secure your AI?",
  subtitle = "Join the compliance revolution.",
  primaryButtonText = "Start Free Audit",
  primaryButtonHref = "/dashboard/create",
  secondaryButtonText = "Contact Sales",
  secondaryButtonHref = "/contact",
  className = "",
}: CTASectionProps) {
  return (
    <section className={`py-24 bg-muted/30 border-y border-border/40 ${className}`}>
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          {title}
        </h2>
        <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="h-14 px-8 text-lg rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            asChild
          >
            <Link href={primaryButtonHref}>
              {primaryButtonText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 text-lg rounded-md border-border bg-background hover:bg-muted/50"
            asChild
          >
            <Link href={secondaryButtonHref}>
              {secondaryButtonText}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
