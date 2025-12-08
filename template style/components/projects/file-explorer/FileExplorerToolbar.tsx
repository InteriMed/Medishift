"use client";

import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";

interface FileExplorerToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function FileExplorerToolbar({
  viewMode,
  onViewModeChange
}: FileExplorerToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="h-8"
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="h-8"
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}

