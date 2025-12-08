"use client";

import React from "react";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { useScanSummary } from "@/hooks/forensic/use-forensic-data";

export function GapRadar() {
    // Hardcoded scan ID for demo purposes - in real app would come from context/params
    const scanId = "demo-scan-123";
    const { data: summaryData, isLoading, error } = useScanSummary(scanId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px] w-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error || !summaryData) {
        return (
            <div className="flex items-center justify-center h-[400px] w-full text-red-500">
                Error loading data: {error || "No data available"}
            </div>
        );
    }

    const chartData = summaryData.radar_data.map(item => ({
        ...item,
        B: item.A * 0.7, // Mocking reality as 70% of intent for demo
    }));


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Intent Card */}
            <Card className="col-span-1 lg:col-span-2 border-l-4 border-l-blue-500">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <ShieldAlert className="w-6 h-6 text-blue-500" />
                                System Intent: High-Risk Medical Device
                            </CardTitle>
                            <CardDescription className="mt-2 text-slate-500">
                                Derived from Intent Vectors in <code>diagnosis.py</code> and <code>patient_data</code> variables.
                            </CardDescription>
                        </div>
                        <Badge variant={summaryData.status === 'critical_review_needed' ? "destructive" : "secondary"} className="text-lg px-4 py-1">
                            {summaryData.status === 'critical_review_needed' ? "BLOCKED" : summaryData.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 150]} />
                            <Radar
                                name="Regulatory Requirement (Intent)"
                                dataKey="A"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.3}
                            />
                            <Radar
                                name="Current Implementation (Reality)"
                                dataKey="B"
                                stroke="#ef4444"
                                fill="#ef4444"
                                fillOpacity={0.5}
                            />
                            <Legend />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Violation List */}
            <Card className="col-span-1 border-l-4 border-l-red-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Critical Violations ({summaryData.violation_count})
                    </CardTitle>
                    <CardDescription>
                        Action required to unblock deployment.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <h4 className="font-semibold text-red-700 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Missing Bias Testing
                        </h4>
                        <p className="text-sm text-red-600 mt-1">
                            Annex IV requirement. No test suite detected for demographic parity.
                        </p>
                        <Button size="sm" variant="destructive" className="mt-3 w-full">
                            Fix Now
                        </Button>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                        <h4 className="font-semibold text-yellow-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Human Oversight Latency
                        </h4>
                        <p className="text-sm text-yellow-600 mt-1">
                            Logs show &lt; 0.5s reaction time, suggesting automation bias.
                        </p>
                        <Button size="sm" variant="outline" className="mt-3 w-full border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                            View Logs
                        </Button>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100 opacity-50">
                        <h4 className="font-semibold text-green-700 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Data Governance
                        </h4>
                        <p className="text-sm text-green-600 mt-1">
                            PII Redaction active. WORM storage verified.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
