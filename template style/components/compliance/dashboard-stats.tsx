'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats as DashboardStatsType } from '@/types/compliance';
import { Github, Zap, Shield, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardStatsProps {
    stats: DashboardStatsType | null;
    isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="h-20 animate-pulse bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const data = stats || {
        total_repos_scanned: 0,
        genai_endpoints_detected: 0,
        compliance_score: 100,
        pending_reviews: 0,
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Total Repos Scanned
                            </p>
                            <p className="text-3xl font-bold">{data.total_repos_scanned}</p>
                        </div>
                        <Github className="w-10 h-10 text-muted-foreground opacity-20" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                GenAI Endpoints Detected
                            </p>
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-bold">{data.genai_endpoints_detected}</p>
                                {data.genai_endpoints_detected > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                        High Risk
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Zap className="w-10 h-10 text-yellow-600 opacity-20" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Compliance Score
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="relative w-16 h-16">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="28"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            fill="none"
                                            className="text-muted"
                                        />
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="28"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            fill="none"
                                            strokeDasharray={`${(data.compliance_score / 100) * 175.9} 175.9`}
                                            className={
                                                data.compliance_score >= 80
                                                    ? 'text-green-600'
                                                    : data.compliance_score >= 60
                                                      ? 'text-yellow-600'
                                                      : 'text-red-600'
                                            }
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold">{data.compliance_score}</span>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">/100</p>
                            </div>
                        </div>
                        <Shield className="w-10 h-10 text-green-600 opacity-20" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Pending Reviews
                            </p>
                            <p className="text-3xl font-bold">{data.pending_reviews}</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

