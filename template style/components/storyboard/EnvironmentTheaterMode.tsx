"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Environment } from "@/types/storyboard";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { PanoramaImageViewer } from "./PanoramaImageViewer";

interface EnvironmentTheaterModeProps {
  open: boolean;
  onClose: () => void;
  environment: Environment | null;
  environments: Environment[];
  onPrevious?: () => void;
  onNext?: () => void;
}

export function EnvironmentTheaterMode({
  open,
  onClose,
  environment,
  environments,
  onPrevious,
  onNext
}: EnvironmentTheaterModeProps) {
  useEffect(() => {
    if (open && environment) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, environment]);

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

  if (!open || !environment) return null;

  const currentIndex = environments.findIndex(e => e.id === environment.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < environments.length - 1;

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
          {environment.imageUrl ? (
            <PanoramaImageViewer
              imageUrl={environment.imageUrl}
              alt={`Environment ${environment.id}`}
              className="w-full h-full max-h-[90vh] rounded-lg"
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-xl mb-4">No image available</p>
              {environment.prompt && (
                <p className="text-white/70 max-w-2xl">{environment.prompt}</p>
              )}
            </div>
          )}

          {/* Environment Info Overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Environment {environment.id}</span>
            </div>
            {environment.prompt && (
              <p className="text-white/80 text-xs mt-1 max-w-2xl text-center">
                {environment.prompt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

