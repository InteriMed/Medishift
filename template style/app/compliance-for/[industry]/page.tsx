'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Shield,
    Github,
    FileCheck,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Industry-specific data
const industryData: Record<
    string,
    {
        name: string;
        description: string;
        commonRisks: string[];
        annexIVHighlights: string[];
        samplePrompt: string;
    }
> = {
    'hr-software': {
        name: 'HR Software & Recruitment',
        description:
            'AI systems used in employment, workers management, and access to self-employment',
        commonRisks: [
            'CV screening algorithms',
            'Candidate ranking systems',
            'Interview analysis tools',
            'Performance monitoring systems',
        ],
        annexIVHighlights: [
            'Training data requirements for bias mitigation',
            'Human oversight and decision-making processes',
            'Transparency obligations to candidates',
            'Data governance and quality metrics',
        ],
        samplePrompt: 'Show me Annex IV requirements for HR recruitment software',
    },
    'healthcare-ai': {
        name: 'Healthcare & Medical AI',
        description:
            'AI systems intended for diagnosis, treatment planning, or health monitoring',
        commonRisks: [
            'Diagnostic imaging analysis',
            'Treatment recommendation systems',
            'Patient triage algorithms',
            'Drug interaction prediction',
        ],
        annexIVHighlights: [
            'Clinical validation and testing documentation',
            'Patient safety risk management',
            'Medical device regulatory alignment',
            'Post-market surveillance requirements',
        ],
        samplePrompt:
            'What clinical documentation is needed for diagnostic AI systems?',
    },
    'credit-scoring': {
        name: 'Credit Scoring & Financial Services',
        description:
            'AI systems for creditworthiness assessment and financial risk evaluation',
        commonRisks: [
            'Credit decision algorithms',
            'Loan approval systems',
            'Insurance underwriting',
            'Fraud detection models',
        ],
        annexIVHighlights: [
            'Fairness and non-discrimination testing',
            'Explainability requirements for automated decisions',
            'Data accuracy and validation processes',
            'Audit trail and logging requirements',
        ],
        samplePrompt: 'How do I document fairness testing for credit algorithms?',
    },
    'law-enforcement': {
        name: 'Law Enforcement & Security',
        description:
            'AI systems for law enforcement, border control, and public safety',
        commonRisks: [
            'Biometric identification systems',
            'Predictive policing algorithms',
            'Risk assessment tools',
            'Surveillance systems',
        ],
        annexIVHighlights: [
            'Fundamental rights impact assessments',
            'Strict human oversight requirements',
            'Special data protection measures',
            'Public transparency obligations',
        ],
        samplePrompt:
            'What are the biometric identification requirements under Article 5?',
    },
    education: {
        name: 'Education & Training',
        description:
            'AI systems used for student assessment, admission, or educational purposes',
        commonRisks: [
            'Automated grading systems',
            'Student admission algorithms',
            'Performance prediction models',
            'Personalized learning systems',
        ],
        annexIVHighlights: [
            'Age-appropriate safeguards',
            'Bias detection in assessment',
            'Transparency to students and parents',
            'Data privacy for minors',
        ],
        samplePrompt: 'Show me requirements for student assessment AI systems',
    },
};

export default function ComplianceForIndustryPage() {
    const params = useParams();
    const industry = params.industry as string;
    const data = industryData[industry];

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Industry Not Found</h1>
                    <p className="text-muted-foreground mb-8">
                        We don't have specific compliance information for this industry yet.
                    </p>
                    <Button asChild>
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <Badge className="mb-4 px-6 py-3 text-sm font-semibold bg-primary/10 text-primary border-primary/20">
                        <Shield className="w-4 h-4 mr-2" />
                        Industry Compliance Guide
                    </Badge>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        EU AI Act for{' '}
                        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-500 dark:to-pink-500 bg-clip-text text-transparent">
                            {data.name}
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {data.description}
                    </p>
                </div>

                <div className="max-w-6xl mx-auto">
                    {/* CTA Section */}
                    <Card className="mb-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-2">
                                        Is Your {data.name} AI Compliant?
                                    </h2>
                                    <p className="opacity-90">
                                        Scan your GitHub repository now for free and get an instant
                                        compliance report
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    className="bg-white text-blue-600 hover:bg-gray-100 shadow-xl"
                                    asChild
                                >
                                    <Link href="/api/github/login">
                                        <Github className="w-5 h-5 mr-2" />
                                        Scan Repository Free
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Common Risks Section */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold mb-6 flex items-center">
                            <AlertTriangle className="w-8 h-8 mr-3 text-orange-500" />
                            Common High-Risk AI Systems in {data.name}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.commonRisks.map((risk, index) => (
                                <Card key={index} className="border-l-4 border-l-orange-500">
                                    <CardContent className="p-4 flex items-center">
                                        <CheckCircle2 className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                                        <span className="font-medium">{risk}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Annex IV Requirements */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold mb-6 flex items-center">
                            <FileCheck className="w-8 h-8 mr-3 text-primary" />
                            Key Annex IV Documentation Requirements
                        </h2>
                        <Card>
                            <CardHeader>
                                <CardTitle>Technical Documentation You'll Need</CardTitle>
                                <CardDescription>
                                    These are the specific Annex IV sections most relevant to{' '}
                                    {data.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {data.annexIVHighlights.map((highlight, index) => (
                                        <li key={index} className="flex items-start">
                                            <CheckCircle2 className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                                            <span>{highlight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ask The Oracle CTA */}
                    <Card className="mb-12 bg-muted/30 border-2 border-primary/20">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold mb-2">
                                        Have Specific Questions?
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        Ask our Regulatory Oracle about {data.name} compliance. Get
                                        instant answers with Article citations.
                                    </p>
                                    <div className="bg-background/80 rounded-lg p-4 border border-border inline-block">
                                        <p className="text-sm font-mono text-primary">
                                            "{data.samplePrompt}"
                                        </p>
                                    </div>
                                </div>
                                <Button size="lg" asChild>
                                    <Link href={`/ask-the-act?q=${encodeURIComponent(data.samplePrompt)}`}>
                                        Ask Oracle
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* How We Help */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold mb-6 text-center">
                            How We Help You Stay Compliant
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                        <Github className="w-6 h-6 text-primary" />
                                    </div>
                                    <CardTitle>Code Scanning</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically detect AI libraries and models in your
                                        codebase that trigger compliance requirements
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                        <FileCheck className="w-6 h-6 text-primary" />
                                    </div>
                                    <CardTitle>Documentation AI</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Generate Annex IV technical documentation drafts using AI
                                        trained on your code context
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                        <Shield className="w-6 h-6 text-primary" />
                                    </div>
                                    <CardTitle>Ongoing Monitoring</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        CI/CD integration to catch compliance issues before they
                                        reach production
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Final CTA */}
                    <div className="text-center">
                        <Button size="lg" asChild className="shadow-xl">
                            <Link href="/pricing">
                                View Pricing & Start Free Trial
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
