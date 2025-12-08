"use client";

import { memo } from "react";
import { Loader2, Wand2 } from "lucide-react";

export const GeneratorLoadingBubble = memo(function GeneratorLoadingBubble({ 
  nodeName, 
  progress 
}: { 
  nodeName: string; 
  progress?: number 
}) {
  return (
    <div className="flex gap-3 sm:gap-4 justify-start">
      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-purple-600/20 dark:from-blue-500/20 dark:via-purple-600/20 dark:to-purple-700/20 flex items-center justify-center ring-2 ring-blue-400/20 dark:ring-purple-600/20 shadow-sm">
        <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </div>
      <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3 sm:py-4 shadow-lg border border-blue-400/20 dark:border-purple-600/40 dark:bg-purple-950/20 bg-card text-foreground">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating {nodeName}...</span>
          </div>
          {progress !== undefined && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="flex gap-1 mt-1">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            <span className="w-2 h-2 bg-primary rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  );
});

