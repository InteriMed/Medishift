import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ShieldCheck,
    ScanSearch,
    FileText,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Bot,
    Terminal,
    Search,
    Activity,
    Server
} from 'lucide-react';
import pseoData from '@/data/pseo_pages.json';

// Define the shape of our pSEO data
type PseoPageData = {
    name: string;
    use_case: string;
    risk: string;
    tech_stack: string[];
    missing_doc: string;
    user_question: string;
    bot_answer: string;
    repo_name: string;
};

// Helper to slugify strings
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
};

// Generate all static paths at build time
export async function generateStaticParams() {
    return pseoData.map((page) => ({
        industry: slugify(page.name),
        useCase: slugify(page.use_case),
    }));
}

// Metadata generation
export async function generateMetadata({ params }: { params: { industry: string; useCase: string } }) {
    const { industry, useCase } = await params;

    const pageData = pseoData.find(
        (p) => slugify(p.name) === industry && slugify(p.use_case) === useCase
    );

    if (!pageData) {
        return {
            title: 'Compliance Check - AuditOps',
        };
    }

    return {
        title: `AI Act Compliance for ${pageData.name} ${pageData.use_case} | AuditOps`,
        description: `Check if your ${pageData.name} ${pageData.use_case} AI system complies with the EU AI Act. Automated risk analysis and documentation generation.`,
    };
}

export default async function ComplianceCheckPage({
    params,
}: {
    params: { industry: string; useCase: string };
}) {
    const { industry, useCase } = await params;

    const pageData = pseoData.find(
        (p) => slugify(p.name) === industry && slugify(p.use_case) === useCase
    );

    if (!pageData) {
        notFound();
    }

    const isHighRisk = pageData.risk.toLowerCase().includes('high') || pageData.risk.toLowerCase().includes('prohibited');
    const riskColor = isHighRisk ? 'text-red-500' : pageData.risk.toLowerCase().includes('limited') ? 'text-yellow-500' : 'text-green-500';
    const riskBg = isHighRisk ? 'bg-red-500/10 border-red-500/20' : pageData.risk.toLowerCase().includes('limited') ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20';

    return (
        <div className="flex flex-col min-h-screen">
            {/* Section 1: The Hook (Chatbot Section) */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-muted/20">
                <div className="container px-4 mx-auto">
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <div className="inline-flex items-center px-3 py-1 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Bot className="w-4 h-4 mr-2" />
                            AI Act Assistant for {pageData.name}
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl mb-6">
                            Is your <span className="text-primary">{pageData.use_case}</span> <br />
                            EU AI Act Compliant?
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Specialized compliance analysis for the {pageData.name} industry.
                        </p>
                    </div>

                    {/* Chatbot Interface */}
                    <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                        <div className="bg-muted/50 p-4 border-b border-border flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground font-mono ml-2">auditops-assistant-v1.0</span>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* User Question */}
                            <div className="flex justify-end">
                                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] shadow-sm">
                                    <p className="font-medium text-sm opacity-90 mb-1">CTO / Head of AI</p>
                                    <p>{pageData.user_question}</p>
                                </div>
                            </div>

                            {/* Bot Answer */}
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-3 max-w-[90%] shadow-sm border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot className="w-4 h-4 text-primary" />
                                        <p className="font-medium text-sm text-primary">AuditOps Legal AI</p>
                                    </div>
                                    <p className="leading-relaxed">{pageData.bot_answer}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 border-t border-border">
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled
                                    placeholder="Ask another question about your compliance..."
                                    className="w-full h-10 pl-4 pr-10 rounded-md border border-input bg-background text-sm text-muted-foreground opacity-60 cursor-not-allowed"
                                />
                                <ArrowRight className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: The Proof (Analysis Section) */}
            <section className="py-24 relative">
                <div className="container px-4 mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Content */}
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                                Real-time Risk Analysis
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                See what happens when AuditOps scans a typical {pageData.name} repository. We detect your specific tech stack and map it to EU AI Act obligations.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Search className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Deep Dependency Scan</h3>
                                        <p className="text-muted-foreground">
                                            Identified usage of <strong>{pageData.tech_stack.join(', ')}</strong> libraries.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Activity className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Risk Classification</h3>
                                        <p className="text-muted-foreground">
                                            Calculated as <span className={`font-bold ${riskColor}`}>{pageData.risk}</span> based on intended use case.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Missing Documentation</h3>
                                        <p className="text-muted-foreground">
                                            Flagged missing: <strong>{pageData.missing_doc}</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10">
                                <Button size="lg" className="h-12 px-8 text-base" asChild>
                                    <Link href="/auth/register">
                                        Scan Your {pageData.name} Repo <ArrowRight className="ml-2 w-4 h-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Right: Terminal Simulation */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full opacity-30" />
                            <div className="relative bg-[#1e1e1e] text-white font-mono text-sm rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-700">
                                    <div className="flex space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                    <div className="text-gray-400 text-xs">auditops-cli — zsh</div>
                                </div>
                                <div className="p-6 space-y-2">
                                    <div className="flex items-center text-green-400">
                                        <span className="mr-2">➜</span>
                                        <span>auditops scan --repo {pageData.repo_name}</span>
                                    </div>
                                    <div className="text-gray-400 animate-pulse">
                                        Initializing compliance engine...
                                    </div>
                                    <div className="text-gray-300">
                                        [INFO] Detected Industry: {pageData.name}
                                    </div>
                                    <div className="text-gray-300">
                                        [INFO] Detected Use Case: {pageData.use_case}
                                    </div>
                                    <div className="border-t border-gray-700 my-2 pt-2">
                                        <div className="text-blue-400 font-bold mb-1">FOUND LIBRARIES:</div>
                                        {pageData.tech_stack.map((tech) => (
                                            <div key={tech} className="flex items-center text-gray-300 pl-4">
                                                <span className="text-green-500 mr-2">✓</span> {tech}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-700 my-2 pt-2">
                                        <div className="text-purple-400 font-bold mb-1">RISK ASSESSMENT:</div>
                                        <div className={`pl-4 font-bold ${isHighRisk ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {pageData.risk.toUpperCase()} RISK DETECTED
                                        </div>
                                    </div>
                                    <div className="bg-red-900/20 border border-red-900/50 p-3 rounded mt-4">
                                        <div className="text-red-400 font-bold flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            COMPLIANCE GAP FOUND
                                        </div>
                                        <div className="text-gray-300 mt-1">
                                            Missing: {pageData.missing_doc}
                                        </div>
                                        <div className="text-gray-400 text-xs mt-2">
                                            Generating template... Done.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-muted/30 border-t border-border">
                <div className="container px-4 mx-auto text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">
                        Don't guess with {pageData.name} compliance
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Get a full audit of your {pageData.repo_name} and generate the required {pageData.missing_doc} in minutes.
                    </p>
                    <Button size="lg" className="h-12 px-8 text-base" asChild>
                        <Link href="/auth/register">Start Free Audit</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
