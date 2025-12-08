"use client";

import { Shield, MessageSquare, LucideIcon } from 'lucide-react';

interface HeaderProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export function Header({ 
  title = "Compliance Assistant",
  description = "Ask questions about EU AI Act compliance, analyze your code, or get guidance on regulatory requirements",
  icon: Icon = Shield
}: HeaderProps) {
  return (
    <div className="border-b border-border/40 dark:border-b-white backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm shadow-black/5 dark:shadow-black/20">
      <div className="max-w-[1000px] mx-auto px-4 py-4 sm:py-5 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {title}
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed text-center max-w-2xl">
          {description}
        </p>
      </div>
    </div>
  );
}

