"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QualitySelectorProps {
    value: string;
    onChange: (value: string) => void;
    qualities?: Array<{ id: string; name: string; tier?: string; label?: string }>;
    disabled?: boolean;
    className?: string;
}

const DEFAULT_QUALITIES = [
    { id: "hd", name: "HD", label: "720p", tier: "free" },
    { id: "fhd", name: "Full HD", label: "1080p", tier: "creator" },
    { id: "4k", name: "4K", label: "2160p", tier: "pro" }
];

export function QualitySelector({
    value,
    onChange,
    qualities = DEFAULT_QUALITIES,
    disabled = false,
    className = ""
}: QualitySelectorProps) {
    const handleValueChange = (newValue: string) => {
        onChange(newValue);
    };

    return (
        <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
            <SelectTrigger
                className={`!w-auto inline-flex h-8 px-3 text-xs font-medium border-white/5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors ${className}`}
                style={{ backgroundImage: 'none' }}
            >
                <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent position="popper" className="!min-w-fit" style={{ width: 'auto' }}>
                {qualities.map((quality) => (
                    <SelectItem
                        key={quality.id}
                        value={quality.id}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span>
                                {quality.name}
                                {quality.label && ` (${quality.label})`}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
