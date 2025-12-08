'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LibraryClassification } from '@/types/compliance';
import { AlertTriangle, AlertCircle, Info, Zap } from 'lucide-react';
import { useState } from 'react';

interface XRayInventoryProps {
    classifications: LibraryClassification[];
    isLoading: boolean;
    onLibraryHover?: (library: string) => void;
    selectedLibrary?: string | null;
}

export function XRayInventory({
    classifications,
    isLoading,
    onLibraryHover,
    selectedLibrary,
}: XRayInventoryProps) {
    const [hoveredLibrary, setHoveredLibrary] = useState<string | null>(null);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                    <CardDescription>Categorized dependencies grouped by LLM</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const grouped = {
        generative_ai: classifications.filter((c) => c.category === 'generative_ai'),
        ml_framework: classifications.filter((c) => c.category === 'ml_framework'),
        infrastructure: classifications.filter((c) => c.category === 'infrastructure'),
        unknown: classifications.filter((c) => c.category === 'unknown'),
    };

    const handleMouseEnter = (library: string) => {
        setHoveredLibrary(library);
        onLibraryHover?.(library);
    };

    const handleMouseLeave = () => {
        setHoveredLibrary(null);
        onLibraryHover?.('');
    };

    const getRiskIcon = (risk: string | null) => {
        if (risk === 'high') return AlertTriangle;
        if (risk === 'medium') return AlertCircle;
        return Info;
    };

    const getRiskColor = (risk: string | null) => {
        if (risk === 'high') return 'text-red-600 bg-red-50 dark:bg-red-950/20';
        if (risk === 'medium') return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>The Inventory</CardTitle>
                <CardDescription>Categorized dependencies grouped by LLM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {grouped.generative_ai.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-yellow-600" />
                            <h3 className="font-semibold">Generative AI</h3>
                            <Badge variant="destructive" className="text-xs">
                                High Risk
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {grouped.generative_ai.map((lib) => {
                                const Icon = getRiskIcon(lib.risk_level);
                                const isHovered = hoveredLibrary === lib.name || selectedLibrary === lib.name;
                                return (
                                    <div
                                        key={lib.name}
                                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                            isHovered
                                                ? 'border-primary shadow-md bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                        } ${getRiskColor(lib.risk_level)}`}
                                        onMouseEnter={() => handleMouseEnter(lib.name)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                <span className="font-medium">{lib.name}</span>
                                            </div>
                                            <Badge
                                                variant={
                                                    lib.risk_level === 'high'
                                                        ? 'destructive'
                                                        : lib.risk_level === 'medium'
                                                          ? 'secondary'
                                                          : 'default'
                                                }
                                                className="text-xs"
                                            >
                                                {lib.risk_level || 'Low'} Risk
                                            </Badge>
                                        </div>
                                        {lib.description && (
                                            <p className="text-xs mt-1 opacity-80">{lib.description}</p>
                                        )}
                                        {lib.article_reference && (
                                            <p className="text-xs mt-1 font-semibold">
                                                Article {lib.article_reference}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {grouped.ml_framework.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-blue-600" />
                            <h3 className="font-semibold">ML Frameworks</h3>
                            <Badge variant="secondary" className="text-xs">
                                Medium Risk
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {grouped.ml_framework.map((lib) => {
                                const Icon = getRiskIcon(lib.risk_level);
                                const isHovered = hoveredLibrary === lib.name || selectedLibrary === lib.name;
                                return (
                                    <div
                                        key={lib.name}
                                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                            isHovered
                                                ? 'border-primary shadow-md bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                        } ${getRiskColor(lib.risk_level)}`}
                                        onMouseEnter={() => handleMouseEnter(lib.name)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                <span className="font-medium">{lib.name}</span>
                                            </div>
                                            <Badge
                                                variant={
                                                    lib.risk_level === 'high'
                                                        ? 'destructive'
                                                        : lib.risk_level === 'medium'
                                                          ? 'secondary'
                                                          : 'default'
                                                }
                                                className="text-xs"
                                            >
                                                {lib.risk_level || 'Low'} Risk
                                            </Badge>
                                        </div>
                                        {lib.description && (
                                            <p className="text-xs mt-1 opacity-80">{lib.description}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {grouped.infrastructure.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-green-600" />
                            <h3 className="font-semibold">Infrastructure</h3>
                            <Badge variant="outline" className="text-xs">
                                Low Risk / Ignore
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {grouped.infrastructure.map((lib) => {
                                const isHovered = hoveredLibrary === lib.name || selectedLibrary === lib.name;
                                return (
                                    <div
                                        key={lib.name}
                                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                            isHovered
                                                ? 'border-primary shadow-md bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                        } ${getRiskColor(lib.risk_level)}`}
                                        onMouseEnter={() => handleMouseEnter(lib.name)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Info className="w-4 h-4" />
                                                <span className="font-medium">{lib.name}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                Low Risk
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {classifications.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        No libraries detected
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

