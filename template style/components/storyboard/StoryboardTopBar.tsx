"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Redo2, MoreVertical, Bell, User, HelpCircle } from "lucide-react";

export function StoryboardTopBar() {
  return (
    <div className="w-full h-12 flex-shrink-0 bg-card border-b border-border z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Help</span>
        </Button>
      </div>
      
      <h1 className="text-white font-semibold text-lg absolute left-1/2 -translate-x-1/2">
        Storyboard
      </h1>
      
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
        >
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold text-white">
            W
          </div>
        </Button>
      </div>
    </div>
  );
}

