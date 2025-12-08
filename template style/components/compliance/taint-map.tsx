'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaintPath } from '@/types/compliance';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useState, useMemo } from 'react';
import { FileCode, ArrowRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaintMapProps {
    taintPaths: TaintPath[];
    isLoading: boolean;
    highlightedLibrary?: string | null;
}

export function TaintMap({ taintPaths, isLoading, highlightedLibrary }: TaintMapProps) {
    const [selectedPath, setSelectedPath] = useState<TaintPath | null>(null);

    const { nodes, edges } = useMemo(() => {
        if (!taintPaths || taintPaths.length === 0) {
            return { nodes: [], edges: [] };
        }

        const nodeMap = new Map<string, Node>();
        const edgeList: Edge[] = [];
        let nodeId = 0;

        taintPaths.forEach((path, pathIndex) => {
            const entryId = `entry-${pathIndex}`;
            const sinkId = `sink-${pathIndex}`;

            if (!nodeMap.has(entryId)) {
                nodeMap.set(entryId, {
                    id: entryId,
                    type: 'default',
                    position: { x: 100, y: pathIndex * 200 + 50 },
                    data: {
                        label: (
                            <div className="p-2">
                                <div className="flex items-center gap-2">
                                    <FileCode className="w-4 h-4" />
                                    <span className="font-semibold text-sm">{path.entry}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{path.entry_file}</p>
                            </div>
                        ),
                    },
                    style: {
                        background: '#f0f0f0',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        padding: 0,
                    },
                });
            }

            path.calls.forEach((call, callIndex) => {
                const callId = `call-${pathIndex}-${callIndex}`;
                if (!nodeMap.has(callId)) {
                    nodeMap.set(callId, {
                        id: callId,
                        type: 'default',
                        position: {
                            x: 300 + callIndex * 200,
                            y: pathIndex * 200 + 50,
                        },
                        data: {
                            label: (
                                <div className="p-2">
                                    <div className="flex items-center gap-2">
                                        <FileCode className="w-4 h-4" />
                                        <span className="font-semibold text-sm">{call.function}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{call.file}</p>
                                </div>
                            ),
                        },
                        style: {
                            background: '#f9f9f9',
                            border: '2px solid #94a3b8',
                            borderRadius: '8px',
                            padding: 0,
                        },
                    });
                }

                const prevId = callIndex === 0 ? entryId : `call-${pathIndex}-${callIndex - 1}`;
                edgeList.push({
                    id: `edge-${pathIndex}-${callIndex}`,
                    source: prevId,
                    target: callId,
                    type: 'smoothstep',
                    animated: true,
                    style: {
                        stroke: path.risk_level === 'high' ? '#ef4444' : path.risk_level === 'medium' ? '#eab308' : '#22c55e',
                        strokeWidth: 2,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: path.risk_level === 'high' ? '#ef4444' : path.risk_level === 'medium' ? '#eab308' : '#22c55e',
                    },
                });
            });

            if (!nodeMap.has(sinkId)) {
                nodeMap.set(sinkId, {
                    id: sinkId,
                    type: 'default',
                    position: {
                        x: 300 + path.calls.length * 200,
                        y: pathIndex * 200 + 50,
                    },
                    data: {
                        label: (
                            <div className="p-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="font-semibold text-sm text-red-600">{path.sink}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{path.sink_file}</p>
                                <Badge
                                    variant={path.risk_level === 'high' ? 'destructive' : 'secondary'}
                                    className="mt-1 text-xs"
                                >
                                    {path.risk_level || 'Low'} Risk
                                </Badge>
                            </div>
                        ),
                    },
                    style: {
                        background: path.risk_level === 'high' ? '#fee2e2' : path.risk_level === 'medium' ? '#fef3c7' : '#dcfce7',
                        border: `2px solid ${path.risk_level === 'high' ? '#ef4444' : path.risk_level === 'medium' ? '#eab308' : '#22c55e'}`,
                        borderRadius: '8px',
                        padding: 0,
                    },
                });
            }

            const lastCallId = path.calls.length > 0 ? `call-${pathIndex}-${path.calls.length - 1}` : entryId;
            edgeList.push({
                id: `edge-${pathIndex}-sink`,
                source: lastCallId,
                target: sinkId,
                type: 'smoothstep',
                animated: true,
                style: {
                    stroke: path.risk_level === 'high' ? '#ef4444' : path.risk_level === 'medium' ? '#eab308' : '#22c55e',
                    strokeWidth: 3,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: path.risk_level === 'high' ? '#ef4444' : path.risk_level === 'medium' ? '#eab308' : '#22c55e',
                },
            });
        });

        return {
            nodes: Array.from(nodeMap.values()),
            edges: edgeList,
        };
    }, [taintPaths]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>The Taint Map</CardTitle>
                    <CardDescription>Visualization of code paths from API routes to AI libraries</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-96 animate-pulse bg-muted rounded" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>The Taint Map</CardTitle>
                <CardDescription>Visualization of code paths from API routes to AI libraries</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[600px] border rounded-lg">
                    {nodes.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No taint paths detected
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            fitView
                            className="bg-background"
                        >
                            <Background />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                    )}
                </div>

                {taintPaths.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="font-semibold text-sm">Trace Detected:</h4>
                        {taintPaths.map((path, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedPath === path
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => setSelectedPath(path)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                            Entry: {path.entry_file} → {path.entry}
                                        </span>
                                    </div>
                                    {path.calls.map((call, callIndex) => (
                                        <div key={callIndex} className="ml-5 flex items-center gap-2">
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-sm">
                                                Call: {call.file} → {call.function}()
                                            </span>
                                        </div>
                                    ))}
                                    <div className="ml-5 flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3 text-red-600" />
                                        <span className="text-sm font-semibold text-red-600">
                                            Sink: {path.sink_file} → {path.sink}
                                        </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs text-muted-foreground">
                                            <strong>Verdict:</strong> This endpoint requires{' '}
                                            {path.article_reference ? (
                                                <>
                                                    Transparency Labeling ({path.article_reference})
                                                </>
                                            ) : (
                                                'Transparency Labeling'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

