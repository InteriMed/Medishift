"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryboardScene, GenerationStep } from "@/types/storyboard";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TheaterModeProps {
  open: boolean;
  onClose: () => void;
  scene: StoryboardScene | null;
  scenes: StoryboardScene[];
  generationStep?: GenerationStep;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function TheaterMode({
  open,
  onClose,
  scene,
  scenes,
  generationStep,
  onPrevious,
  onNext
}: TheaterModeProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (open && scene) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, scene]);

  useEffect(() => {
    if (!open) {
      setIsVideoPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onPrevious, onNext]);

  if (!open || !scene) return null;

  const currentIndex = scenes.findIndex(s => s.id === scene.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < scenes.length - 1;

  const getMediaUrl = () => {
    if ((generationStep === 'video_generation' || generationStep === 'video_upscale') && scene.thumbnailUrl) {
      return scene.thumbnailUrl.replace(/\/images\//, '/videos/').replace(/\.(jpg|png)$/, '.mp4');
    }
    return scene.thumbnailUrl;
  };

  const isVideo = (generationStep === 'video_generation' || generationStep === 'video_upscale') && scene.thumbnailUrl;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation Buttons */}
        {hasPrevious && onPrevious && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 z-10 h-12 w-12 text-white hover:bg-white/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {hasNext && onNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 z-10 h-12 w-12 text-white hover:bg-white/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Media Content */}
        <div className="relative w-full h-full flex items-center justify-center max-w-7xl max-h-[90vh]">
          {isVideo && getMediaUrl() ? (
            <video
              ref={(el) => setVideoRef(el)}
              src={getMediaUrl()}
              className="max-w-full max-h-full object-contain rounded-lg"
              controls
              autoPlay
              loop
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.video-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : scene.thumbnailUrl ? (
            <img
              src={scene.thumbnailUrl}
              alt={scene.title || `Scene ${scene.sceneNumber}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-xl mb-4">No media available</p>
              <p className="text-white/70">{scene.prompt}</p>
            </div>
          )}

          {/* Video Fallback */}
          {isVideo && (
            <div className="video-fallback hidden absolute inset-0 items-center justify-center">
              {scene.thumbnailUrl && (
                <img
                  src={scene.thumbnailUrl}
                  alt={scene.title || `Scene ${scene.sceneNumber}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>
          )}

          {/* Scene Info Overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Scene {scene.sceneNumber}</span>
              <span className="text-white/70">
                {scene.start.toFixed(1)}s - {scene.end.toFixed(1)}s
              </span>
            </div>
            {scene.prompt && (
              <p className="text-white/80 text-xs mt-1 max-w-2xl text-center">
                {scene.prompt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

