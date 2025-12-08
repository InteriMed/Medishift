"use client";

import { AudioTrack } from "@/types/storyboard";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface SoundTrackProps {
  track: AudioTrack;
  timelineWidth: number;
  onTrackDelete?: (trackId: string) => void;
}

export function SoundTrack({
  track,
  timelineWidth,
  onTrackDelete
}: SoundTrackProps) {
  return (
    <div
      className="relative h-[86px] bg-zinc-900/80 rounded-lg border border-zinc-800/50 mt-2"
      style={{ width: `${timelineWidth}px` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-red-500/20 border-r border-zinc-800/50 flex items-center justify-center rounded-l-lg">
        {onTrackDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-full text-white hover:text-red-100"
            onClick={(e) => {
              e.stopPropagation();
              onTrackDelete(track.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="ml-20 h-full relative">
        {/* Track name as background label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-zinc-700 font-medium opacity-30">{track.name}</span>
        </div>
        {/* Track content area - can be expanded later for audio clips */}
      </div>
    </div>
  );
}

