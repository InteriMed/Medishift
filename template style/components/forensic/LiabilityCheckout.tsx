"use client";

import { useCertifyScan } from "@/hooks/forensic/use-forensic-data";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Lock, AlertTriangle, PenTool, Download } from "lucide-react";

const blackBoxNodes = [
    { id: "bin_1", name: "lib_native.so", type: "Binary Blob", risk: "High" },
    { id: "model_1", name: "sentiment_v2.onnx", type: "Obfuscated Model", risk: "Medium" },
];

export function LiabilityCheckout() {
    const [step, setStep] = useState(1);
    const [certified, setCertified] = useState(false);
    const [justification, setJustification] = useState("");
    const [signature, setSignature] = useState("");
    const { certify, isLoading, error } = useCertifyScan();

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    return (
        <Card className="w-full max-w-3xl mx-auto border-t-4 border-t-purple-600 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="w-6 h-6 text-purple-600" />
                    Liability Certification & Report Generation
                </CardTitle>
                <CardDescription>
                    Final gate before deployment. You are accepting the role of <strong>Deployer</strong> under EU AI Act Art. 26.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Progress Steps */}
                <div className="flex justify-between mb-8 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10" />
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                                {s}
                            </div>
                            <span className={`text-xs font-medium ${step >= s ? "text-purple-700" : "text-slate-400"}`}>
                                {s === 1 ? "Black Box Review" : s === 2 ? "Regression Justification" : "Signature"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Black Box Review */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                                <Lock className="w-4 h-4 text-slate-600" />
                                Review Opaque Components
                            </h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Risk Level</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blackBoxNodes.map((node) => (
                                        <TableRow key={node.id}>
                                            <TableCell className="font-medium">{node.name}</TableCell>
                                            <TableCell>{node.type}</TableCell>
                                            <TableCell>
                                                <Badge variant={node.risk === "High" ? "destructive" : "secondary"}>
                                                    {node.risk}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="certify" checked={certified} onCheckedChange={(c) => setCertified(c as boolean)} />
                            <label htmlFor="certify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I certify that I have reviewed these components and they do not contain prohibited AI practices.
                            </label>
                        </div>
                    </div>
                )}

                {/* Step 2: Regression Justification */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                Safety Threshold Regression Detected
                            </h3>
                            <p className="text-sm text-yellow-700 mb-4">
                                The overall safety score has dropped from <strong>0.92</strong> to <strong>0.78</strong> since the last scan.
                                You must provide a business justification for this regression to proceed.
                            </p>
                            <Textarea
                                placeholder="Explain the business reason for this regression..."
                                className="bg-white"
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Signature */}
                {step === 3 && (
                    <div className="space-y-6 text-center py-6">
                        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <PenTool className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold">Final Sign-off</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            By generating this report, you confirm that all information is accurate to the best of your knowledge and accept liability for the deployment of this system.
                        </p>
                        <div className="max-w-sm mx-auto">
                            <Input
                                placeholder="Type your full legal name"
                                className="text-center text-lg h-12"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Digital Signature: {signature ? `Signed by ${signature}` : "Waiting for input..."}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
                <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                    Back
                </Button>
                {step < 3 ? (
                    <Button
                        onClick={handleNext}
                        disabled={(step === 1 && !certified) || (step === 2 && justification.length < 10)}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Next Step
                    </Button>
                ) : (
                    <Button
                        className="bg-green-600 hover:bg-green-700 gap-2"
                        disabled={!signature}
                        onClick={async () => {
                            const result = await certify("demo-scan-123", signature, justification);
                            if (result) {
                                alert(`Report Generated! WORM Hash: ${result.worm_hash}`);
                            }
                        }}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Generate Report & Sign
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
