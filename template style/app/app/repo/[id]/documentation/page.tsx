'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ArrowLeft,
    Save,
    Download,
    CheckCircle2,
    Circle,
    Loader2,
    Sparkles,
    FileText,
} from 'lucide-react';

// Annex IV sections
interface AnnexSection {
    id: string;
    title: string;
    question: string;
    llmDraft: string;
    userEdited: string;
    status: 'draft' | 'approved' | 'pending';
}

const mockSections: AnnexSection[] = [
    {
        id: '1',
        title: 'System Description',
        question:
            'Provide a general description of the AI system including its intended purpose, the person/entity developing it, and the date and version of the system.',
        llmDraft:
            'This is an AI-powered recruitment system designed to screen and rank job candidates based on their CVs and interview responses. The system was developed by Acme Corporation for use in their HR department. Current version: 2.3.1, dated October 2024.',
        userEdited: '',
        status: 'draft',
    },
    {
        id: '2',
        title: 'Data & Data Governance',
        question:
            'Describe the data used for training, validation, and testing. Include data sources, collection methods, and governance measures.',
        llmDraft:
            'Training data consists of 50,000 anonymized CVs collected from public job boards between 2020-2024. Validation set includes 5,000 manually labeled CVs. Data preprocessing includes removal of protected characteristics (age, gender, ethnicity) to mitigate bias. Data governance follows ISO 27001 standards with quarterly audits.',
        userEdited: '',
        status: 'draft',
    },
    {
        id: '3',
        title: 'Risk Management',
        question:
            'Describe the risk management system, including identification and mitigation of risks related to health, safety, and fundamental rights.',
        llmDraft:
            'Risk assessment identifies potential discrimination as primary concern. Mitigation strategies include: (1) Bias detection testing on protected characteristics, (2) Human-in-the-loop review for final decisions, (3) Explainability features showing ranking factors, (4) Regular fairness audits against EEOC guidelines.',
        userEdited: '',
        status: 'pending',
    },
    {
        id: '4',
        title: 'Human Oversight',
        question:
            'Describe the human oversight measures, including who oversees the system and how they can intervene.',
        llmDraft: '',
        userEdited: '',
        status: 'pending',
    },
];

export default function DocumentationPage() {
    const params = useParams();
    const repoId = params.id as string;

    const [sections, setSections] = useState<AnnexSection[]>([]);
    const [activeSection, setActiveSection] = useState<string>('1');
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        // TODO: Replace with actual API call
        setSections(mockSections);
    }, [repoId]);

    const activeDoc = sections.find((s) => s.id === activeSection);

    const handleSave = async () => {
        setIsSaving(true);
        // TODO: Implement actual save API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSaving(false);
    };

    const handleGenerate = async (sectionId: string) => {
        setIsGenerating(true);
        // TODO: Implement actual LLM generation API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsGenerating(false);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        // TODO: Implement PDF export
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsExporting(false);
    };

    const handleApprove = (sectionId: string) => {
        setSections((prev) =>
            prev.map((s) =>
                s.id === sectionId ? { ...s, status: 'approved' as const } : s
            )
        );
    };

    const handleEditChange = (value: string) => {
        setSections((prev) =>
            prev.map((s) =>
                s.id === activeSection ? { ...s, userEdited: value } : s
            )
        );
    };

    const completedCount = sections.filter((s) => s.status === 'approved').length;
    const progress = (completedCount / sections.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href={`/app/repo/${repoId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Repository
                        </Link>
                    </Button>

                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                Annex IV Documentation
                            </h1>
                            <p className="text-muted-foreground">
                                Technical documentation required for high-risk AI systems
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Progress
                            </Button>
                            <Button onClick={handleExportPDF} disabled={isExporting}>
                                {isExporting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Export PDF
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                    Documentation Progress
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {completedCount} of {sections.length} sections completed
                                </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Section Navigation */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Sections</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${activeSection === section.id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium truncate">
                                                {section.title}
                                            </span>
                                            {section.status === 'approved' ? (
                                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                                            ) : (
                                                <Circle className="w-4 h-4 flex-shrink-0 opacity-30" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Split Screen Editor */}
                    <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Question & AI Draft */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Question & AI Draft</span>
                                    {activeDoc?.status !== 'approved' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleGenerate(activeSection)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 mr-2" />
                                            )}
                                            Regenerate
                                        </Button>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    AI-generated draft based on your code analysis
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold mb-2 text-primary">
                                            Requirement:
                                        </h3>
                                        <p className="text-sm bg-muted p-4 rounded-lg">
                                            {activeDoc?.question}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold mb-2 flex items-center">
                                            <Sparkles className="w-4 h-4 mr-1 text-purple-500" />
                                            AI Generated Draft:
                                        </h3>
                                        {activeDoc?.llmDraft ? (
                                            <div className="text-sm bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-900">
                                                <p className="whitespace-pre-wrap">
                                                    {activeDoc.llmDraft}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg text-center">
                                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p>No draft generated yet</p>
                                                <Button
                                                    size="sm"
                                                    className="mt-3"
                                                    onClick={() => handleGenerate(activeSection)}
                                                    disabled={isGenerating}
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                    )}
                                                    Generate Draft
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: User Editable Version */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Final Version</CardTitle>
                                <CardDescription>
                                    Edit the AI draft or write your own content
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Textarea
                                        value={
                                            activeDoc?.userEdited ||
                                            activeDoc?.llmDraft ||
                                            ''
                                        }
                                        onChange={(e) => handleEditChange(e.target.value)}
                                        placeholder="Edit the AI-generated draft or write your own content..."
                                        className="min-h-[300px] font-mono text-sm"
                                    />

                                    <div className="flex gap-2">
                                        {activeDoc?.status === 'approved' ? (
                                            <Badge className="bg-green-600">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Button
                                                onClick={() => handleApprove(activeSection)}
                                                disabled={
                                                    !activeDoc?.llmDraft && !activeDoc?.userEdited
                                                }
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Approve Section
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
