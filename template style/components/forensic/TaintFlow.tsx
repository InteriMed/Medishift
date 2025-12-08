"use client";

import React, { useCallback, useState, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Connection,
    addEdge,
    EdgeProps,
    getBezierPath,
    BaseEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X } from "lucide-react";

// --- Custom Edge Component for Probabilistic Links ---
const ProbabilisticEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: EdgeProps) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<"pending" | "verified" | "rejected">("pending");

    const onVerify = () => {
        setStatus("verified");
        setOpen(false);
        // In a real app, this would trigger a backend update
    };

    const onReject = () => {
        setStatus("rejected");
        setOpen(false);
    };

    const edgeColor = status === "verified" ? "#22c55e" : status === "rejected" ? "#ef4444" : "#eab308";
    const edgeStyle = { ...style, stroke: edgeColor, strokeDasharray: status === "pending" ? "5,5" : "none" };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
            <foreignObject
                width={160}
                height={40}
                x={(sourceX + targetX) / 2 - 80}
                y={(sourceY + targetY) / 2 - 20}
                className="overflow-visible"
            >
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className="flex justify-center cursor-pointer">
                            <Badge
                                variant="outline"
                                className={`bg-white hover:bg-slate-50 border-${status === 'verified' ? 'green' : status === 'rejected' ? 'red' : 'yellow'}-500 text-${status === 'verified' ? 'green' : status === 'rejected' ? 'red' : 'yellow'}-700`}
                            >
                                {status === "pending" ? "85% Confidence" : status === "verified" ? "Verified Link" : "Rejected Link"}
                            </Badge>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                Unverified Link
                            </h4>
                            <p className="text-sm text-slate-500">
                                Our analysis suggests <code>process_data()</code> calls <code>lib_native.so</code>.
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={onReject}>
                                    <X className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onVerify}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Confirm
                                </Button>
                            </div>
                            <p className="text-xs text-slate-400 text-center mt-2">
                                By confirming, you accept liability for this data path.
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>
            </foreignObject>
        </>
    );
};

// --- Initial Graph Data ---
const initialNodes: Node[] = [
    {
        id: "1",
        type: "input",
        data: { label: "Input (Camera)" },
        position: { x: 50, y: 100 },
        style: { background: "#fff", border: "1px solid #777", width: 150 },
    },
    {
        id: "2",
        data: { label: "Variable (FaceVector)" },
        position: { x: 250, y: 100 },
        style: { background: "#fee2e2", border: "2px solid #ef4444", width: 180, color: "#b91c1c" }, // Tainted
    },
    {
        id: "3",
        data: { label: "Function (Process)" },
        position: { x: 500, y: 100 },
        style: { background: "#dbeafe", border: "1px solid #3b82f6", width: 150, color: "#1e40af" }, // Python
    },
    {
        id: "4",
        data: { label: "Binary (lib_native.so)" },
        position: { x: 500, y: 250 },
        style: { background: "#ffedd5", border: "1px solid #f97316", width: 160, color: "#9a3412" }, // C++
    },
    {
        id: "5",
        type: "output",
        data: { label: "API (Public)" },
        position: { x: 750, y: 100 },
        style: { background: "#f3e8ff", border: "1px solid #a855f7", width: 150, color: "#6b21a8" }, // Storage/API
    },
];

const initialEdges: Edge[] = [
    {
        id: "e1-2",
        source: "1",
        target: "2",
        animated: true,
        style: { stroke: "#ef4444", strokeWidth: 2 }, // Taint flow
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
    },
    {
        id: "e2-3",
        source: "2",
        target: "3",
        animated: true,
        style: { stroke: "#ef4444", strokeWidth: 2 }, // Taint flow
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
    },
    {
        id: "e3-5",
        source: "3",
        target: "5",
        style: { stroke: "#94a3b8", strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    },
    {
        id: "e3-4",
        source: "3",
        target: "4",
        type: "probabilistic", // Custom edge type
        data: { confidence: 0.85 },
    },
];

const edgeTypes = {
    probabilistic: ProbabilisticEdge,
};

import { useScanGraph } from "@/hooks/forensic/use-forensic-data";

interface TaintFlowProps {
    scanId?: string;
}

export function TaintFlow({ scanId = "scan-clipizy" }: TaintFlowProps) {
    const { data: graphData, isLoading, error } = useScanGraph(scanId);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (graphData) {
            setNodes(graphData.nodes.map(n => ({
                ...n,
                // Ensure style is properly typed/parsed if needed
                style: n.style || {}
            })));
            setEdges(graphData.edges.map(e => ({
                ...e,
                // Ensure markerEnd is properly set if it was lost in JSON
                markerEnd: { type: MarkerType.ArrowClosed, color: e.style?.stroke || "#94a3b8" }
            })));
        }
    }, [graphData, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [snippets, setSnippets] = useState<any[]>([]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        // Find edges pointing to this node that have snippets
        const relevantEdges = edges.filter(e => e.target === node.id && e.data?.snippet);
        setSnippets(relevantEdges.map(e => ({
            snippet: e.data.snippet,
            line: e.data.line,
            file: e.data.file,
            source: e.source
        })));
    }, [edges]);

    const closeInspector = () => {
        setSelectedNode(null);
        setSnippets([]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[500px] w-full border rounded-lg bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[500px] w-full border rounded-lg bg-slate-50 text-red-500">
                Error loading graph: {error}
            </div>
        );
    }

    return (
        <div className="h-[500px] w-full border rounded-lg bg-slate-50 relative flex flex-col">
            {graphData?.is_exploitable && (
                <div className="bg-red-100 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-800 text-sm font-semibold animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    CRITICAL: Exploitable Data Flow Detected!
                </div>
            )}
            <div className="flex-1 h-full relative flex">
                <div className="flex-1 h-full">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        edgeTypes={edgeTypes}
                        fitView
                    >
                        <Background color="#cbd5e1" gap={16} />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>

                {/* Code Snippet Inspector Sidebar */}
                {selectedNode && (
                    <div className="w-1/3 h-full border-l bg-white p-4 overflow-y-auto shadow-xl absolute right-0 top-0 z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                {selectedNode.data.icon && (
                                    <span className="text-xl">{selectedNode.data.icon === 'skull' ? '💀' : selectedNode.data.icon === 'save' ? '💾' : '🌐'}</span>
                                )}
                                {selectedNode.data.label}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={closeInspector}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="mb-4">
                            <Badge variant={selectedNode.data.riskLevel === 'critical' ? 'destructive' : 'outline'}>
                                {selectedNode.data.risk || 'Unknown Risk'}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Usages Found</h4>

                            {snippets.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No code snippets available for this node.</p>
                            ) : (
                                snippets.map((snip, idx) => (
                                    <div key={idx} className="border rounded-md p-3 bg-slate-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-mono text-slate-500">{snip.file}:{snip.line}</span>
                                        </div>
                                        <pre className="text-xs bg-slate-900 text-slate-50 p-2 rounded overflow-x-auto">
                                            <code>{snip.snippet}</code>
                                        </pre>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
