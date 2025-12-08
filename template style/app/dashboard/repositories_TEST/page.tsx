'use client';

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
    Github,
    Clock,
    AlertTriangle,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Plus,
} from 'lucide-react';
import { useRepositoriesTest } from '@/hooks/compliance/use-compliance-data-test';

export default function RepositoriesTestPage() {
    const { repositories, isLoading, refetch } = useRepositoriesTest();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'green':
                return 'bg-green-500';
            case 'yellow':
                return 'bg-yellow-500';
            case 'red':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'green':
                return CheckCircle2;
            case 'yellow':
                return AlertCircle;
            case 'red':
                return AlertTriangle;
            default:
                return AlertCircle;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Repositories (TEST)</h1>
                    <p className="text-muted-foreground">
                        Test environment: Managing clipizy test repository for AI compliance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="lg" asChild>
                        <Link href="/api/github/login">
                            <Plus className="w-5 h-5 mr-2" />
                            Add Repository
                        </Link>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Loading test repositories...</p>
                </div>
            ) : repositories.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Github className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2">No test repositories found</h3>
                            <p className="text-muted-foreground mb-4">
                                The clipizy test repository should appear here
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {repositories.map((repo) => {
                        const StatusIcon = getStatusIcon(repo.status);
                        return (
                            <Link
                                key={repo.id}
                                href={`/dashboard/repo/${repo.id}`}
                                className="block"
                            >
                                <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="relative">
                                                    <div
                                                        className={`w-4 h-4 rounded-full ${getStatusColor(
                                                            repo.status
                                                        )} ring-4 ring-offset-2 ${getStatusColor(
                                                            repo.status
                                                        )}/20`}
                                                    />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-lg">
                                                            {repo.full_name || repo.name}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                repo.status === 'red'
                                                                    ? 'destructive'
                                                                    : repo.status === 'yellow'
                                                                        ? 'secondary'
                                                                        : 'default'
                                                            }
                                                        >
                                                            {repo.riskLevel || 'Unknown'}
                                                        </Badge>
                                                        <Badge variant="outline">TEST</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {repo.lastScan}
                                                        </span>
                                                        {repo.findingsCount > 0 && (
                                                            <span className="flex items-center">
                                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                                {repo.findingsCount} finding
                                                                {repo.findingsCount !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {repo.scan_count !== undefined && (
                                                            <span>
                                                                {repo.scan_count} scan{repo.scan_count !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <Button variant="outline" size="sm">
                                                View Details
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

