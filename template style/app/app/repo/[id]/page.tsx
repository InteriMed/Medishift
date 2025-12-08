'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    FileText,
    RefreshCw,
    Github,
    Clock,
} from 'lucide-react';
import { useRepositories, useTaintAnalysis, useLibraryClassifications } from '@/hooks/compliance/use-compliance-data';
import { XRayInventory } from '@/components/compliance/xray-inventory';
import { TaintMap } from '@/components/compliance/taint-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RepoDetailPage() {
    const params = useParams();
    const repoId = params.id as string;

    const { repositories } = useRepositories();
    const { taintPaths, isLoading: taintLoading } = useTaintAnalysis(repoId);
    const { classifications, isLoading: classificationsLoading } = useLibraryClassifications(repoId);

    const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const repo = repositories.find((r) => r.id === repoId);

    useEffect(() => {
        setIsLoading(false);
    }, [repoId, repositories]);

    const handleLibraryHover = (library: string) => {
        setSelectedLibrary(library || null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!repo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Repository Not Found</h1>
                    <Button asChild>
                        <Link href="/app/dashboard">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 p-8">
            <div className="max-w-[1800px] mx-auto">
                <div className="mb-8">
                    <Button variant="ghost" asChild className="mb-4">
                        <Link href="/app/dashboard">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                                {repo.name}
                                {repo.status === 'red' && (
                                    <Badge variant="destructive" className="text-base">
                                        High Risk
                                    </Badge>
                                )}
                                {repo.status === 'yellow' && (
                                    <Badge variant="secondary" className="text-base">
                                        Medium Risk
                                    </Badge>
                                )}
                                {repo.status === 'green' && (
                                    <Badge className="text-base bg-green-600">Compliant</Badge>
                                )}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Last scan: {repo.lastScan}
                                </span>
                                <span>•</span>
                                <span>{repo.findingsCount} findings</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {repo.githubUrl && (
                                <Button variant="outline" asChild>
                                    <a href={repo.githubUrl} target="_blank" rel="noopener noreferrer">
                                        <Github className="w-4 h-4 mr-2" />
                                        View on GitHub
                                    </a>
                                </Button>
                            )}
                            <Button>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-scan
                            </Button>
                            <Button variant="default" asChild>
                                <Link href={`/app/repo/${repoId}/documentation`}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Documentation
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="xray" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="xray">X-Ray View</TabsTrigger>
                        <TabsTrigger value="findings">Findings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="xray" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <XRayInventory
                                classifications={classifications}
                                isLoading={classificationsLoading}
                                onLibraryHover={handleLibraryHover}
                                selectedLibrary={selectedLibrary}
                            />
                            <TaintMap
                                taintPaths={taintPaths}
                                isLoading={taintLoading}
                                highlightedLibrary={selectedLibrary}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="findings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Compliance Findings</CardTitle>
                                <CardDescription>Issues detected in this repository</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {taintPaths.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No findings detected
                                        </div>
                                    ) : (
                                        taintPaths.map((path, index) => (
                                            <div
                                                key={index}
                                                className={`border-l-4 p-4 rounded-r-lg ${
                                                    path.risk_level === 'high'
                                                        ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                                                        : path.risk_level === 'medium'
                                                          ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                                                          : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2 mb-2">
                                                    {path.risk_level === 'high' ? (
                                                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <h4
                                                            className={`font-semibold ${
                                                                path.risk_level === 'high'
                                                                    ? 'text-red-700 dark:text-red-400'
                                                                    : 'text-yellow-700 dark:text-yellow-400'
                                                            }`}
                                                        >
                                                            {path.risk_level === 'high' ? 'High' : 'Medium'} Risk: {path.sink}
                                                        </h4>
                                                        <p className="text-sm mt-1">
                                                            Entry: {path.entry_file} → {path.entry}
                                                        </p>
                                                        <p className="text-sm">
                                                            Sink: {path.sink_file} → {path.sink}
                                                        </p>
                                                    </div>
                                                </div>
                                                {path.article_reference && (
                                                    <div className="mt-3 ml-7">
                                                        <p className="text-xs text-muted-foreground mb-2">
                                                            <strong>Article {path.article_reference}:</strong> This endpoint requires transparency labeling.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
