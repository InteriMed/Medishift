"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Music, Play, Pause } from "lucide-react";

export const AudioTrackItem = memo(function AudioTrackItem({ 
  fileName, 
  audioUrl, 
  fileId 
}: { 
  fileName: string; 
  audioUrl: string | null; 
  fileId?: string 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingRef = useRef(false);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const handleEnded = () => {
      setIsPlaying(false);
      wasPlayingRef.current = false;
    };
    const handlePause = () => {
      setIsPlaying(false);
      wasPlayingRef.current = false;
    };
    const handlePlay = () => {
      setIsPlaying(true);
      wasPlayingRef.current = true;
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    
    if (wasPlayingRef.current && !audio.paused) {
      setIsPlaying(true);
    }
    
    return () => {
      const wasPlaying = !audio.paused;
      wasPlayingRef.current = wasPlaying;
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioUrl]);
  
  useEffect(() => {
    if (audioRef.current && wasPlayingRef.current && !audioRef.current.paused) {
      setIsPlaying(true);
    }
  }, [audioUrl]);
  
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Failed to play audio:', err);
          setIsPlaying(false);
        });
      }
    }
  };
  
  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2.5 text-xs sm:text-sm bg-background/40 px-2.5 py-1.5 rounded-lg border border-border/30">
        <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        <span className="truncate font-medium">{fileName}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2.5 text-xs sm:text-sm bg-background/40 px-2.5 py-1.5 rounded-lg border border-border/30">
      <button
        onClick={handlePlayPause}
        className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
        ) : (
          <Play className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
        )}
      </button>
      <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
      <span className="truncate font-medium flex-1">{fileName}</span>
      <audio ref={audioRef} src={audioUrl} preload="metadata" key={fileId || audioUrl} />
    </div>
  );
});

