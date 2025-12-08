"use client";

import React, { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, MessageSquare, FileJson, Search } from "lucide-react";

const chatHistory = [
    {
        role: "user",
        content: "Can you analyze this patient data for risk?",
    },
    {
        role: "agent",
        content: "I have analyzed the input. It contains PII (names, dates). I have sanitized it before processing.",
        ragSource: "GDPR Art 17 - Right to Erasure",
    },
];

export function AgentInterrogation() {
    const [highlightedSource, setHighlightedSource] = useState<string | null>(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            {/* Left Pane: Chat */}
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Conversation Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                            {chatHistory.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                    onMouseEnter={() => msg.role === "agent" && setHighlightedSource(msg.ragSource || null)}
                                    onMouseLeave={() => setHighlightedSource(null)}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-100 text-slate-900 border border-slate-200 hover:border-blue-400 cursor-help transition-colors"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Right Pane: Thought Process */}
            <Card className="flex flex-col h-full border-l-4 border-l-green-500">
                <CardHeader className="bg-green-50/50 pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                            <Search className="w-5 h-5" />
                            Agent Reasoning
                        </CardTitle>
                        <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm">
                            Verdict: Safe (98%)
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4">
                        <Accordion type="single" collapsible defaultValue="reasoning" className="w-full">

                            {/* Section 1: Reasoning */}
                            <AccordionItem value="reasoning">
                                <AccordionTrigger className="font-semibold text-slate-800">
                                    1. Analysis & Reasoning
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 space-y-2">
                                    <p>
                                        Agent analyzed user input. Detected <strong>PII</strong> patterns matching standard regex for names and dates.
                                    </p>
                                    <p>
                                        Action taken: <strong>Sanitized input</strong> before SQL query execution to prevent data leakage.
                                    </p>
                                    <div className={`mt-2 p-2 rounded bg-blue-50 border border-blue-100 text-xs font-mono transition-opacity ${highlightedSource === "GDPR Art 17 - Right to Erasure" ? "opacity-100 ring-2 ring-blue-400" : "opacity-70"}`}>
                                        Source: GDPR Art 17 - Right to Erasure
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Section 2: Auditor Check */}
                            <AccordionItem value="auditor">
                                <AccordionTrigger className="font-semibold text-slate-800">
                                    2. Auditor Verification (2nd Agent)
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-md border border-green-100">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Verified</p>
                                            <p className="text-xs text-green-700 mt-1">
                                                Auditor confirms reasoning matches RAG source "GDPR Art 17". No hallucinations detected.
                                            </p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Section 3: Raw Logs */}
                            <AccordionItem value="logs">
                                <AccordionTrigger className="font-semibold text-slate-800">
                                    3. Raw Trace Logs
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="bg-slate-950 text-slate-50 p-3 rounded-md font-mono text-xs overflow-x-auto">
                                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                                            <FileJson className="w-3 h-3" />
                                            <span>trace_id: 8f9a-2b3c</span>
                                        </div>
                                        <pre>{JSON.stringify({
                                            step: "pii_detection",
                                            input_length: 45,
                                            detected_entities: ["PERSON", "DATE"],
                                            sanitization: true,
                                            latency_ms: 124
                                        }, null, 2)}</pre>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
