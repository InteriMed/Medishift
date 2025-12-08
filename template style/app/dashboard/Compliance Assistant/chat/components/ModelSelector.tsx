"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    models?: Array<{ id: string; name: string; tier?: string }>;
    disabled?: boolean;
    className?: string;
}

export function ModelSelector({
    value,
    onChange,
    models = [
        { id: "default", name: "Default" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-3.5", name: "GPT-3.5" },
        { id: "claude", name: "Claude" }
    ],
    disabled = false,
    className = ""
}: ModelSelectorProps) {
    const { resolvedTheme } = useTheme();
    const isDarkMode = resolvedTheme === 'dark';

    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger
                className={`w-auto h-8 px-3 text-xs font-medium border-white/5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ${className}`}
                style={{ backgroundImage: 'none' }}
            >
                <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
                {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.tier && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {model.tier}
                                </span>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
