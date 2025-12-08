'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    FileText,
    Download,
    Copy,
    CheckCircle2,
    ArrowLeft,
    FileCode,
    Calendar,
    User,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { useRepositoriesForReportsTest } from '@/hooks/compliance/use-compliance-data-test';
import { ComplianceReport, TransparencyText, ChangeLogEntry } from '@/types/compliance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/ui/use-toast';

export default function ReportsTestPage() {
    const { repositories } = useRepositoriesForReportsTest();
    const { toast } = useToast();
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [report, setReport] = useState<ComplianceReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (repositories.length > 0 && !selectedRepo) {
            setSelectedRepo(repositories[0].id);
        }
    }, [repositories, selectedRepo]);

    const mockTransparencyTexts: TransparencyText[] = [
        {
            endpoint: '/api/v1/video',
            suggested_text: 'This video is AI-generated using fal_client (Image Gen).',
            libraries: ['fal_client'],
            article_reference: 'Article 50',
        },
        {
            endpoint: '/api/v1/avatar',
            suggested_text: 'This avatar is AI-generated. Powered by Generative AI.',
            libraries: ['openai', 'fal_client'],
            article_reference: 'Article 50',
        },
    ];

    const mockChangeLog: ChangeLogEntry[] = [
        {
            id: '1',
            date: '2024-11-24T10:30:00Z',
            developer: 'developer-x',
            change: 'Added openai to auth.py',
            risk_impact: 'increased',
            risk_level: 'high',
        },
        {
            id: '2',
            date: '2024-11-23T14:20:00Z',
            developer: 'developer-y',
            change: 'Removed face_recognition from legacy_code.py',
            risk_impact: 'decreased',
            risk_level: 'medium',
        },
    ];

    const generateReport = async () => {
        if (!selectedRepo) {
            toast({
                title: 'Error',
                description: 'Please select a repository',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        setTimeout(() => {
            setReport({
                id: 'report-1',
                scan_id: 'scan-1',
                repo_id: selectedRepo,
                generated_at: new Date().toISOString(),
                article_50_endpoints: [],
                transparency_texts: mockTransparencyTexts,
                change_log: mockChangeLog,
            });
            setIsGenerating(false);
            toast({
                title: 'Success',
                description: 'Test report generated successfully',
            });
        }, 2000);
    };

    const downloadPDF = () => {
        toast({
            title: 'Info',
            description: 'PDF download will be implemented with backend integration',
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Success',
            description: 'Copied to clipboard',
        });
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports & Compliance (TEST)</h1>
                    <p className="text-muted-foreground">
                        Test environment: Generate compliance reports for clipizy test repository
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border rounded-md bg-background"
                        value={selectedRepo || ''}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                    >
                        <option value="">Select Repository</option>
                        {repositories.map((repo) => (
                            <option key={repo.id} value={repo.id}>
                                {repo.name} (TEST)
                            </option>
                        ))}
                    </select>
                    <Button onClick={generateReport} disabled={isGenerating || !selectedRepo}>
                        {isGenerating ? 'Generating...' : 'Generate Report'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="article50" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="article50">Article 50 Report</TabsTrigger>
                    <TabsTrigger value="transparency">Transparency Text Generator</TabsTrigger>
                    <TabsTrigger value="changelog">Change Log</TabsTrigger>
                </TabsList>

                <TabsContent value="article50" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Article 50 Compliance Report (TEST)</CardTitle>
                                    <CardDescription>
                                        A generated PDF that lists every public-facing endpoint that uses GenAI
                                    </CardDescription>
                                </div>
                                <Button onClick={downloadPDF} variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {report ? (
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-5 h-5" />
                                            <h3 className="font-semibold">Report Generated (TEST)</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Generated on {formatDate(report.generated_at)}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Endpoints Requiring Transparency Labeling:</h4>
                                        {report.article_50_endpoints.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No endpoints detected requiring Article 50 compliance
                                            </p>
                                        ) : (
                                            report.article_50_endpoints.map((endpoint, index) => (
                                                <Card key={index}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {endpoint.method} {endpoint.path}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {endpoint.file}:{endpoint.line}
                                                                </p>
                                                                <div className="flex gap-2 mt-2">
                                                                    {endpoint.libraries.map((lib) => (
                                                                        <Badge key={lib} variant="outline">
                                                                            {lib}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <Badge
                                                                variant={
                                                                    endpoint.risk_level === 'high'
                                                                        ? 'destructive'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {endpoint.risk_level || 'Low'} Risk
                                                            </Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>Select a repository and generate a report to view Article 50 compliance</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transparency" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transparency Text Generator (TEST)</CardTitle>
                            <CardDescription>
                                Based on the graph, the system suggests the disclaimer text for each endpoint
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {mockTransparencyTexts.map((text, index) => (
                                    <Card key={index}>
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold">{text.endpoint}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Article {text.article_reference}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {text.libraries.map((lib) => (
                                                            <Badge key={lib} variant="outline">
                                                                {lib}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={text.suggested_text}
                                                    readOnly
                                                    className="font-mono text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(text.suggested_text)}
                                                    >
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Text
                                                    </Button>
                                                    <Button size="sm" variant="outline">
                                                        <FileCode className="w-4 h-4 mr-2" />
                                                        Get React Component
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {mockTransparencyTexts.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No transparency texts generated yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="changelog" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Log (TEST)</CardTitle>
                            <CardDescription>
                                Track changes that affect compliance risk levels
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {mockChangeLog.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDate(entry.date)}
                                                    </span>
                                                    {entry.developer && (
                                                        <>
                                                            <span>•</span>
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <span className="text-sm text-muted-foreground">
                                                                    {entry.developer}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="font-medium mb-2">{entry.change}</p>
                                                <div className="flex items-center gap-2">
                                                    {entry.risk_impact === 'increased' ? (
                                                        <TrendingUp className="w-4 h-4 text-red-600" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4 text-green-600" />
                                                    )}
                                                    <span className="text-sm">
                                                        Risk Level {entry.risk_impact} to{' '}
                                                        <Badge
                                                            variant={
                                                                entry.risk_level === 'high'
                                                                    ? 'destructive'
                                                                    : entry.risk_level === 'medium'
                                                                      ? 'secondary'
                                                                      : 'default'
                                                            }
                                                            className="ml-1"
                                                        >
                                                            {entry.risk_level || 'Low'}
                                                        </Badge>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {mockChangeLog.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No change log entries yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

