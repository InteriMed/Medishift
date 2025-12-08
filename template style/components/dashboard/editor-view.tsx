import { Terminal, FileText, Play, Save, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EditorView() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
            {/* Editor Pane */}
            <div className="rounded-md border bg-card flex flex-col overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Terminal className="w-4 h-4" />
                        <span className="font-mono">compliance_check.py</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Save className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20">
                            <Play className="w-3 h-3 mr-1" />
                            Run Check
                        </Button>
                    </div>
                </div>
                <div className="flex-1 p-4 font-mono text-sm bg-[#1e1e1e] text-gray-300 overflow-auto">
                    <pre>
                        {`def check_compliance(model):
    """
    Validates model against EU AI Act Article 6.
    """
    risk_score = 0
    
    # Check for biometric categorization
    if model.capabilities.biometric:
        risk_score += 50
        print("WARNING: Biometric categorization detected")
        
    # Check for critical infrastructure
    if model.deployment.sector == "infrastructure":
        risk_score += 30
        
    # Check for credit scoring
    if model.capabilities.credit_scoring:
        risk_score += 40

    return "High Risk" if risk_score > 40 else "Low Risk"`}
                    </pre>
                </div>
            </div>

            {/* Preview/Output Pane */}
            <div className="rounded-md border bg-card flex flex-col overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>Output Preview</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Download className="w-3 h-3" />
                    </Button>
                </div>
                <div className="flex-1 p-8 bg-white text-black overflow-auto">
                    <div className="max-w-md mx-auto border p-8 shadow-sm bg-white min-h-full">
                        <div className="flex justify-between items-start mb-6">
                            <h1 className="text-xl font-bold">Compliance Report</h1>
                            <div className="text-xs text-gray-400">ID: #8392-A</div>
                        </div>

                        <div className="space-y-6 text-sm">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-md text-red-800">
                                <strong className="block text-lg mb-1">Status: High Risk System</strong>
                                <p className="text-xs opacity-80">Based on Article 6, Paragraph 2 of EU AI Act</p>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-xs">Detected Issues</h3>
                                <ul className="list-disc pl-4 space-y-2 text-gray-600">
                                    <li><span className="font-medium text-red-600">Biometric categorization</span> capability detected in model architecture.</li>
                                    <li>Missing <span className="font-medium">human oversight</span> documentation for high-risk deployment.</li>
                                    <li><span className="font-medium">Data governance</span> framework incomplete for sensitive datasets.</li>
                                </ul>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-xs">Required Actions</h3>
                                <ol className="list-decimal pl-4 space-y-2 text-gray-600">
                                    <li>Complete <strong>Annex IV</strong> technical documentation.</li>
                                    <li>Implement and document <strong>human oversight</strong> measures (Article 14).</li>
                                    <li>Register system in the <strong>EU High-Risk AI Database</strong>.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
