"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StructuredData } from "@/components/seo/structured-data";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Code,
  FileText,
  HelpCircle,
  Lock,
  Zap,
  Users,
  ArrowRight
} from "lucide-react";

const faqCategories = [
  {
    id: "general",
    name: "General",
    icon: HelpCircle,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    id: "security",
    name: "Security",
    icon: Lock,
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  {
    id: "compliance",
    name: "Compliance",
    icon: Shield,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  {
    id: "technical",
    name: "Technical",
    icon: Code,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10"
  },
  {
    id: "billing",
    name: "Billing",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10"
  }
];

const faqData = [
  {
    category: "general",
    question: "What is AuditOps?",
    answer: "AuditOps is an automated compliance platform for the EU AI Act. We help companies analyze their AI systems, generate technical documentation (Annex IV), and monitor for ongoing regulatory risks."
  },
  {
    category: "security",
    question: "Do you store my source code?",
    answer: "No. We operate with a zero-retention architecture. Your code is cloned into an ephemeral, isolated environment for analysis and is immediately deleted once the scan is complete. We only store the metadata and compliance reports."
  },
  {
    category: "compliance",
    question: "Does this replace a legal team?",
    answer: "AuditOps automates the technical and documentation aspects of compliance, which are often the most time-consuming. However, we always recommend that your final documentation be reviewed by legal counsel, especially for High-Risk AI systems."
  },
  {
    category: "technical",
    question: "What languages do you support?",
    answer: "We currently support Python (including Jupyter Notebooks) and JavaScript/TypeScript, as these are the most common languages for AI development. We are actively adding support for R and C++."
  },
  {
    category: "security",
    question: "Where is the data hosted?",
    answer: "Our infrastructure is hosted entirely in Switzerland, ensuring strict data privacy and neutrality. For Enterprise customers, we offer on-premise or VPC deployments."
  },
  {
    category: "compliance",
    question: "What is Annex IV?",
    answer: "Annex IV of the EU AI Act outlines the technical documentation required for High-Risk AI systems. It includes detailed information about the system's architecture, data, development process, and performance metrics. AuditOps automates the generation of this document."
  },
  {
    category: "billing",
    question: "How are 'scans' counted?",
    answer: "A scan is counted each time you trigger an analysis of a repository, either manually via the dashboard or automatically via CI/CD. The Free tier includes 1 scan per month."
  },
  {
    category: "technical",
    question: "Can I integrate this into my CI/CD pipeline?",
    answer: "Yes. Our Pro and Enterprise plans include a GitHub App that can automatically scan every Pull Request and block merges if compliance checks fail."
  }
];

export default function FAQPage() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleExpanded = (index: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = selectedCategory
    ? faqData.filter(faq => faq.category === selectedCategory)
    : faqData;

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary pt-16">
      {/* STRUCTURED DATA */}
      <StructuredData type="faq" data={faqStructuredData} />

      {/* HERO SECTION */}
      <section className="relative py-20 overflow-hidden">
        <div className="fixed inset-0 bg-swiss-cross opacity-30 pointer-events-none" />

        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/20 text-primary bg-primary/5 rounded-full">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help Center
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Everything you need to know about AuditOps, compliance, and security.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORY FILTER */}
      <section className="py-8 bg-secondary/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="transition-all duration-200"
            >
              All Questions
            </Button>
            {faqCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="transition-all duration-200"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ CONTENT */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {filteredFAQs.map((faq, index) => {
              const category = faqCategories.find(cat => cat.id === faq.category);
              const Icon = category?.icon || FileText;
              const isExpanded = expandedItems.has(index.toString());

              return (
                <Card key={index} className="mb-6 hover:shadow-md transition-all duration-300 border-border bg-card">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleExpanded(index.toString())}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 ${category?.bgColor || 'bg-primary/10'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${category?.color || 'text-primary'}`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-foreground mb-1">
                            {faq.question}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {category?.name || 'General'}
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Can't find what you're looking for? Our support team is here to help.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">
                  <Users className="w-5 h-5 mr-2" />
                  Contact Support
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard/create">
                  <Zap className="w-5 h-5 mr-2" />
                  Start Free Audit
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
