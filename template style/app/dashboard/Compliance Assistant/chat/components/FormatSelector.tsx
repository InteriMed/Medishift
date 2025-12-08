"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface FormatSelectorProps {
    value: string;
    onChange: (value: string) => void;
    formats?: Array<{ id: string; name: string; ratio: string; icon?: string; tier?: string }>;
    disabled?: boolean;
    className?: string;
}

const DEFAULT_FORMATS = [
    { id: "landscape", name: "Landscape", ratio: "16:9", icon: "▭" },
    { id: "portrait", name: "Portrait", ratio: "9:16", icon: "▯" },
    { id: "square", name: "Square", ratio: "1:1", icon: "□" },
    { id: "widescreen", name: "Widescreen", ratio: "21:9", icon: "▬" }
];

export function FormatSelector({
    value,
    onChange,
    formats = DEFAULT_FORMATS,
    disabled = false,
    className = ""
}: FormatSelectorProps) {
    const handleValueChange = (newValue: string) => {
        onChange(newValue);
    };

    return (
        <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
            <SelectTrigger
                className={`!w-auto inline-flex h-8 px-3 text-xs font-medium border-white/5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ${className}`}
                style={{ backgroundImage: 'none' }}
            >
                <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent position="popper" className="!min-w-fit" style={{ width: 'auto' }}>
                {formats.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-1 py-0.5 rounded w-10 text-center bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/60">
                                    {format.ratio}
                                </span>
                                <span className="text-xs">{format.name}</span>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
