'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
    ShieldCheck,
    ScanSearch,
    FileText,
    ArrowRight,
    CheckCircle2,
    Building2,
    Lock,
    Zap,
    Sparkles,
    Send,
    Scale,
} from 'lucide-react';

export default function Home() {
    const { isAuthenticated } = useAuth();
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
            },
        },
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-swiss-cross opacity-10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background pointer-events-none" />

                <div className="container relative z-10 px-4 mx-auto">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center px-3 py-1 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                            <span className="flex w-2 h-2 mr-2 rounded-full bg-primary animate-pulse" />
                            EU AI Act Compliance Ready
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-6"
                        >
                            Institutional Grade <br />
                            <span className="text-primary">AI Compliance</span>
                        </motion.h1>

                        <motion.p
                            variants={itemVariants}
                            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
                        >
                            Automated Annex IV Compliance and Risk Analysis for the EU AI Act.
                            Secure, scalable infrastructure designed for banks and enterprises.
                        </motion.p>

                        <motion.div
                            variants={itemVariants}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                                <Link href={isAuthenticated ? "/dashboard/create" : "/auth/register"}>
                                    {isAuthenticated ? "Open Compliance Assistant" : "Get Started"} <ArrowRight className="ml-2 w-4 h-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                                <Link href="/ask-the-act">Ask The AI Act</Link>
                            </Button>
                            {!isAuthenticated && (
                                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                                    <Link href="/contact">Book a Demo</Link>
                                </Button>
                            )}
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Social Proof Section */}
            <section className="py-12 border-y border-border/40 bg-muted/30">
                <div className="container px-4 mx-auto text-center">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
                        Trusted by leading compliance teams
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
                        {/* Placeholder Logos - In a real app, these would be SVGs */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-8 w-32 bg-foreground/10 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>

            {/* Value Proposition / How it Works (Moved Up) */}
            <section className="py-24 bg-muted/30">
                <div className="container px-4 mx-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                                    Built for the Enterprise
                                </h2>
                                <div className="space-y-6">
                                    <ValuePropItem
                                        icon={<Building2 className="w-6 h-6 text-primary" />}
                                        title="Institutional Infrastructure"
                                        description="Bank-grade security and scalability to handle complex AI portfolios."
                                    />
                                    <ValuePropItem
                                        icon={<Lock className="w-6 h-6 text-primary" />}
                                        title="Data Sovereignty"
                                        description="Your code and data never leave your secure environment. On-premise deployment available."
                                    />
                                    <ValuePropItem
                                        icon={<Zap className="w-6 h-6 text-primary" />}
                                        title="Continuous Monitoring"
                                        description="Real-time monitoring of your AI systems to ensure ongoing compliance as regulations evolve."
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full opacity-30" />
                                <div className="relative bg-card border border-border rounded-xl shadow-2xl p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">auditops-scan-v2.1.0</div>
                                        </div>
                                        <div className="space-y-3 font-mono text-sm">
                                            <div className="flex items-center text-green-500">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                <span>Repository connected successfully</span>
                                            </div>
                                            <div className="flex items-center text-blue-500">
                                                <ScanSearch className="w-4 h-4 mr-2" />
                                                <span>Scanning for AI models...</span>
                                            </div>
                                            <div className="pl-6 text-muted-foreground">
                                                Found: Llama-2-7b-chat-hf
                                            </div>
                                            <div className="pl-6 text-muted-foreground">
                                                Found: Scikit-learn Classifier
                                            </div>
                                            <div className="flex items-center text-primary">
                                                <ShieldCheck className="w-4 h-4 mr-2" />
                                                <span>Risk Assessment Complete</span>
                                            </div>
                                            <div className="p-3 bg-muted rounded border border-border mt-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-semibold">Risk Level:</span>
                                                    <span className="text-orange-500 font-bold">High Risk</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Annex IV documentation required.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 relative">
                <div className="container px-4 mx-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                                Comprehensive Compliance Suite
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Everything you need to ensure your AI systems meet EU regulatory standards.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<ScanSearch className="w-10 h-10 text-primary" />}
                                title="Automated Analysis"
                                description="Instantly scan your repositories to detect AI models and assess their technical specifications against EU standards."
                            />
                            <FeatureCard
                                icon={<ShieldCheck className="w-10 h-10 text-primary" />}
                                title="Risk Classification"
                                description="Automatically classify your AI systems into Prohibited, High, Limited, or Minimal risk categories with high precision."
                            />
                            <FeatureCard
                                icon={<FileText className="w-10 h-10 text-primary" />}
                                title="Compliance Reports"
                                description="Generate audit-ready Annex IV documentation and technical files with a single click."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Ask the Act Section (New) */}
            <section className="py-24 bg-muted/30">
                <div className="container px-4 mx-auto">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                                <Sparkles className="w-4 h-4 mr-2" />
                                New Feature
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl rounded-full opacity-30" />
                                <div className="relative bg-card border border-border rounded-xl shadow-2xl p-6 sm:p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">ask-the-act-v1.0</div>
                                        </div>

                                        <div className="space-y-6 font-sans text-sm">
                                            {/* User Message */}
                                            <div className="flex justify-end">
                                                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                                                    <p>Is emotion recognition prohibited under the AI Act?</p>
                                                </div>
                                            </div>

                                            {/* AI Message */}
                                            <div className="flex justify-start">
                                                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] space-y-3">
                                                    <p>Yes, emotion recognition systems are prohibited in certain contexts.</p>
                                                    <p>Under <span className="font-semibold text-primary">Article 5</span>, the use of AI systems to infer emotions of a natural person in the areas of workplace and education institutions is a prohibited AI practice.</p>

                                                    {/* Citations Visual */}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <div className="flex items-center text-xs bg-background border border-border rounded-full px-2 py-1 text-muted-foreground">
                                                            <FileText className="w-3 h-3 mr-1" />
                                                            Article 5(1)(f)
                                                        </div>
                                                        <div className="flex items-center text-xs bg-background border border-border rounded-full px-2 py-1 text-muted-foreground">
                                                            <FileText className="w-3 h-3 mr-1" />
                                                            Recital 28
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input Area Simulation */}
                                            <div className="relative mt-4">
                                                <div className="h-10 bg-muted/50 rounded-md border border-border w-full flex items-center px-3 text-muted-foreground text-xs">
                                                    Ask a follow-up question...
                                                </div>
                                                <div className="absolute right-2 top-2">
                                                    <Send className="w-6 h-6 text-primary opacity-50" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                                    Direct Access to Regulatory Intelligence
                                </h2>
                                <p className="text-lg text-muted-foreground mb-8">
                                    Don't waste hours searching through legal PDFs. Ask our specialized LLM questions about the EU AI Act and get instant, cited answers directly from the official text.
                                </p>

                                <div className="space-y-6 mb-8">
                                    <ValuePropItem
                                        icon={<Scale className="w-6 h-6 text-primary" />}
                                        title="Direct Source Citations"
                                        description="Every answer includes direct references to specific Articles and Recitals."
                                    />
                                    <ValuePropItem
                                        icon={<ShieldCheck className="w-6 h-6 text-primary" />}
                                        title="Accurate & Reliable"
                                        description="Powered by advanced AI trained specifically on the EU AI Act."
                                    />
                                    <ValuePropItem
                                        icon={<FileText className="w-6 h-6 text-primary" />}
                                        title="Comprehensive Coverage"
                                        description="Covers prohibited practices, high-risk classifications, and more."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-8">
                            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                                <Link href="/ask-the-act">
                                    Try Ask The AI Act
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5" />
                <div className="container relative z-10 px-4 mx-auto">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                            Ready to secure your AI compliance?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                            Join forward-thinking enterprises ensuring their AI systems are safe, compliant, and future-proof.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" asChild>
                                <Link href="/auth/register">Start Free Audit</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 bg-background" asChild>
                                <Link href="/contact">Contact Sales</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <div className="mb-4 p-3 rounded-lg bg-primary/5 w-fit group-hover:bg-primary/10 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}

function ValuePropItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
                <div className="p-2 rounded-lg bg-primary/10">
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold mb-1">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
