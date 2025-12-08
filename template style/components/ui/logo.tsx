import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <img
                src="/logo.svg"
                alt="Logo"
                className="w-full h-full object-contain"
            />
        </div>
    );
}
