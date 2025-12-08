"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GapRadar } from "@/components/forensic/GapRadar";
import { TaintFlow } from "@/components/forensic/TaintFlow";
import { AgentInterrogation } from "@/components/forensic/AgentInterrogation";
import { LiabilityCheckout } from "@/components/forensic/LiabilityCheckout";
import { Shield, Activity, MessageSquare, FileText } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forensic Cockpit</h1>
                    <p className="text-slate-500 mt-1">
                        EU AI Act Compliance & Liability Management System
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    System Active
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-slate-100 p-1">
                    <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Shield className="w-4 h-4" />
                        Gap Radar
                    </TabsTrigger>
                    <TabsTrigger value="taint" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Activity className="w-4 h-4" />
                        Taint Flow
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MessageSquare className="w-4 h-4" />
                        Agent Audit
                    </TabsTrigger>
                    <TabsTrigger value="certify" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4" />
                        Certify
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4">
                        <GapRadar />
                    </div>
                </TabsContent>

                <TabsContent value="taint" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Data Taint & Liability Flow</h2>
                            <p className="text-sm text-slate-500">Visualize radioactive data paths and verify probabilistic links.</p>
                        </div>
                        <TaintFlow />
                    </div>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Agent Interrogation Room</h2>
                            <p className="text-sm text-slate-500">Audit AI decision making with granular reasoning traces.</p>
                        </div>
                        <AgentInterrogation />
                    </div>
                </TabsContent>

                <TabsContent value="certify" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="grid gap-4">
                        <LiabilityCheckout />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}