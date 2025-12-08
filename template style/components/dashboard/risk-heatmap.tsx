import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const riskData = [
    { file: "model_training.py", repo: "auditops-core", risk: "High", status: "Non-Compliant", lastScan: "2m ago" },
    { file: "data_processing.py", repo: "auditops-core", risk: "Medium", status: "Review Needed", lastScan: "15m ago" },
    { file: "utils.py", repo: "auditops-core", risk: "Low", status: "Compliant", lastScan: "1h ago" },
    { file: "api_server.py", repo: "auditops-api", risk: "Low", status: "Compliant", lastScan: "2h ago" },
    { file: "auth_service.py", repo: "auditops-auth", risk: "High", status: "Critical", lastScan: "5m ago" },
    { file: "customer_data.py", repo: "auditops-data", risk: "High", status: "Non-Compliant", lastScan: "10m ago" },
    { file: "frontend_app.tsx", repo: "auditops-web", risk: "Low", status: "Compliant", lastScan: "3h ago" },
];

export function RiskHeatmap() {
    return (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Risk Heatmap</h3>
                    <p className="text-sm text-muted-foreground">Real-time compliance status of your repositories.</p>
                </div>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    3 Critical Issues
                </Badge>
            </div>
            <ScrollArea className="h-[400px]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">File</th>
                            <th className="px-4 py-3 font-medium">Repository</th>
                            <th className="px-4 py-3 font-medium">Risk Level</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Last Scan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {riskData.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs">{item.file}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.repo}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className={cn(
                                        "border-0",
                                        item.risk === "High" && "bg-red-500/10 text-red-500",
                                        item.risk === "Medium" && "bg-yellow-500/10 text-yellow-500",
                                        item.risk === "Low" && "bg-green-500/10 text-green-500",
                                    )}>
                                        {item.risk}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cn(
                                        "flex items-center gap-2",
                                        item.status === "Non-Compliant" && "text-red-500",
                                        item.status === "Critical" && "text-red-600 font-bold",
                                        item.status === "Review Needed" && "text-yellow-500",
                                        item.status === "Compliant" && "text-green-500",
                                    )}>
                                        <span className={cn("w-2 h-2 rounded-full",
                                            item.status === "Non-Compliant" ? "bg-red-500" :
                                                item.status === "Critical" ? "bg-red-600" :
                                                    item.status === "Review Needed" ? "bg-yellow-500" :
                                                        "bg-green-500"
                                        )} />
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">{item.lastScan}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    );
}
