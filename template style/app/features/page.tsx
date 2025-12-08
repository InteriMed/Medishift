import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Check,
  Shield,
  Code,
  FileText,
  GitBranch,
  ArrowRight,
  Zap,
  Lock,
  Search
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features & Capabilities | AuditOps',
  description:
    'Explore the full range of AI compliance features including static code analysis, legal mapping, and automated reporting.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      {/* HERO SECTION */}
      <section className="relative py-20 overflow-hidden">
        <div className="fixed inset-0 bg-swiss-cross opacity-30 pointer-events-none" />

        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/20 text-primary bg-primary/5 rounded-full">
              <Zap className="w-4 h-4 mr-2" />
              Platform Capabilities
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
              What Can <span className="text-primary">AuditOps</span> Do?
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              AuditOps is an end-to-end compliance engine for the EU AI Act.
              It combines static analysis, LLM reasoning, and legal templates to automate your regulatory obligations.
            </p>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section className="py-16 bg-secondary/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* WORKFLOWS */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">
                Automated Workflows
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg font-medium text-primary">
                  We integrate directly into your development lifecycle to catch compliance issues before they reach production.
                </p>
                <p className="text-muted-foreground">
                  Our flagship <strong>Continuous Compliance</strong> workflow monitors your repositories for changes, automatically flagging new AI libraries or high-risk patterns.
                </p>
                <ul className="space-y-4 mt-6">
                  <li className="flex items-start">
                    <div className="mt-1 mr-3 bg-primary/10 p-1 rounded">
                      <GitBranch className="w-4 h-4 text-primary" />
                    </div>
                    <span>
                      <strong>GitHub Integration:</strong> Zero-config setup via our GitHub App. We scan every PR.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="mt-1 mr-3 bg-primary/10 p-1 rounded">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                    <span>
                      <strong>Deep Code Analysis:</strong> We parse Python, JavaScript, and Jupyter Notebooks to build a dependency graph of your AI stack.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="mt-1 mr-3 bg-primary/10 p-1 rounded">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span>
                      <strong>Annex IV Reporting:</strong> Automatically generate the technical documentation required by the EU AI Act.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ENGINES */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">
                The Engine Room
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg font-medium">
                  Our platform is powered by three distinct analysis engines working in concert.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start space-x-3">
                      <Code className="w-6 h-6 text-blue-500 mt-1" />
                      <div>
                        <div className="font-bold">The Inspector</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Static analysis engine that identifies libraries (PyTorch, TF) and data flows.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start space-x-3">
                      <Shield className="w-6 h-6 text-purple-500 mt-1" />
                      <div>
                        <div className="font-bold">Legal Brain</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          LLM layer that maps technical findings to specific legal articles.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start space-x-3">
                      <FileText className="w-6 h-6 text-pink-500 mt-1" />
                      <div>
                        <div className="font-bold">The Bureaucrat</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Documentation engine that compiles findings into PDF/Word reports.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 flex items-start space-x-3">
                      <Lock className="w-6 h-6 text-orange-500 mt-1" />
                      <div>
                        <div className="font-bold">Gatekeeper</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Auth & permission layer ensuring data sovereignty and security.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURE TABLE */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Detailed Capabilities
            </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A complete breakdown of what AuditOps analyzes and generates.
              </p>
            </div>

            <Card className="overflow-hidden border-border shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[200px] font-bold">
                    Category
                  </TableHead>
                  <TableHead className="w-[250px] font-bold">
                    Feature
                  </TableHead>
                  <TableHead className="font-bold">
                    Description
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ANALYSIS */}
                <TableRow>
                  <TableCell className="font-medium text-primary">
                    Analysis
                  </TableCell>
                  <TableCell>Dependency Scanning</TableCell>
                  <TableCell>
                    Identifies AI/ML libraries (scikit-learn, pandas, torch) and their versions.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-primary">
                    Analysis
                  </TableCell>
                  <TableCell>Risk Classification</TableCell>
                  <TableCell>
                    Determines if an AI system is "High Risk" based on intended purpose (e.g., biometrics, critical infra).
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-primary">
                    Analysis
                  </TableCell>
                  <TableCell>Data Lineage</TableCell>
                  <TableCell>
                    Traces data sources and preprocessing steps to ensure data governance compliance.
                  </TableCell>
                </TableRow>

                {/* REPORTING */}
                <TableRow>
                  <TableCell className="font-medium text-primary">
                    Reporting
                  </TableCell>
                  <TableCell>Annex IV Generation</TableCell>
                  <TableCell>
                    Auto-fills the official EU technical documentation template.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-primary">
                    Reporting
                  </TableCell>
                  <TableCell>Gap Analysis</TableCell>
                  <TableCell>
                    Highlights missing documentation or non-compliant architectural patterns.
                  </TableCell>
                </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 bg-secondary/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Common Questions
            </h2>
            <p className="text-muted-foreground">
              Technical details about our analysis engine.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-medium">
                Does AuditOps execute my code?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. We perform <strong>static analysis</strong> only. We parse the Abstract Syntax Tree (AST) to understand logic without running potentially unsafe code.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-medium">
                How do you handle private repositories?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We use ephemeral, isolated environments for each scan. Once the analysis is complete (usually seconds), the environment is destroyed. No code is persisted.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-medium">
                Is the legal advice binding?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                AuditOps provides a technical mapping to legal requirements. While highly accurate, it does not constitute formal legal counsel. We recommend review by your legal team.
              </AccordionContent>
            </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Ready to Automate Compliance?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Stop manually filling out spreadsheets. Let AuditOps handle the paperwork.
              </p>
              <Button
                size="lg"
                className="h-14 px-10 text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link href="/dashboard/create">
                  Start Free Audit <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
