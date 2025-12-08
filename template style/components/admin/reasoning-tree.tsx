import React from 'react';
import { ChevronDown, ChevronRight, Check, X, AlertCircle, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ReasoningStep {
    code: number;
    name: string;
    timestamp: string;
    duration_ms: number;
    details: Record<string, any>;
}

interface ReasoningTreeProps {
    reasoningTree: Record<string, ReasoningStep>;
    expandedSteps?: Set<string>;
    onToggleStep?: (stepKey: string) => void;
}

const STEP_CATEGORIES = {
    '1000': { name: 'Initialization', color: 'bg-blue-500', icon: Brain },
    '1100': { name: 'Context Check', color: 'bg-purple-500', icon: AlertCircle },
    '1200': { name: 'Search', color: 'bg-green-500', icon: Brain },
    '1300': { name: 'Ranking', color: 'bg-yellow-500', icon: Brain },
    '1400': { name: 'Policy', color: 'bg-red-500', icon: AlertCircle },
    '1500': { name: 'Validation', color: 'bg-orange-500', icon: AlertCircle },
    '1600': { name: 'Decision: Direct', color: 'bg-green-600', icon: Check },
    '1700': { name: 'Decision: Reject', color: 'bg-red-600', icon: X },
    '1800': { name: 'Decision: Thinking', color: 'bg-purple-600', icon: Brain },
    '1900': { name: 'Decision: Clarify', color: 'bg-yellow-600', icon: AlertCircle },
};

function getStepCategory(code: number) {
    const categoryCode = Math.floor(code / 100) * 100;
    return STEP_CATEGORIES[categoryCode.toString() as keyof typeof STEP_CATEGORIES] || {
        name: 'Unknown',
        color: 'bg-gray-500',
        icon: AlertCircle,
    };
}

function getIndentLevel(code: number): number {
    // Decisions are at root level (0)
    if (code >= 1600) return 0;
    // Main phases at level 1
    if (code % 100 === 0) return 0;
    // Sub-steps at level 1
    return 1;
}

export function ReasoningTree({ reasoningTree, expandedSteps = new Set(), onToggleStep }: ReasoningTreeProps) {
    const steps = Object.entries(reasoningTree)
        .map(([key, step]) => ({ key, ...step }))
        .sort((a, b) => a.code - b.code);

    if (steps.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reasoning tree data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-2">
            {steps.map((step, index) => {
                const category = getStepCategory(step.code);
                const Icon = category.icon;
                const isExpanded = expandedSteps.has(step.key);
                const hasDetails = Object.keys(step.details).length > 0;
                const indentLevel = getIndentLevel(step.code);

                return (
                    <div
                        key={step.key}
                        className="border rounded-lg overflow-hidden"
                        style={{ marginLeft: `${indentLevel * 24}px` }}
                    >
                        <button
                            onClick={() => hasDetails && onToggleStep?.(step.key)}
                            className={`w-full p-3 flex items-center justify-between transition-colors ${hasDetails ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Step Number */}
                                <div
                                    className={`flex items-center justify-center w-16 h-8 rounded ${category.color} text-white text-sm font-mono font-bold`}
                                >
                                    {step.code}
                                </div>

                                {/* Step Icon */}
                                <Icon className="h-5 w-5 text-muted-foreground" />

                                {/* Step Name */}
                                <div className="text-left">
                                    <p className="font-semibold">{step.name.replace(/_/g, ' ')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {step.duration_ms != null 
                                          ? `${Number(step.duration_ms).toFixed(0)}ms`
                                          : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Expand Icon */}
                            {hasDetails && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {Object.keys(step.details).length} details
                                    </Badge>
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5" />
                                    )}
                                </div>
                            )}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && hasDetails && (
                            <div className="p-4 border-t bg-muted/50 space-y-3">
                                {Object.entries(step.details).map(([key, value]) => (
                                    <div key={key} className="space-y-1">
                                        <h5 className="text-sm font-semibold text-muted-foreground">
                                            {key.replace(/_/g, ' ').toUpperCase()}:
                                        </h5>
                                        <div className="bg-background p-3 rounded border">
                                            {typeof value === 'object' ? (
                                                <pre className="text-xs overflow-x-auto">
                                                    {JSON.stringify(value, null, 2)}
                                                </pre>
                                            ) : (
                                                <p className="text-sm">{String(value)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
