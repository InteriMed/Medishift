"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageTheaterProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
}

export function ImageTheater({
  open,
  onClose,
  imageUrl,
  imageAlt = "Image",
  videoUrl,
  mediaType
}: ImageTheaterProps) {
  const mediaUrl = videoUrl || imageUrl;
  const isVideo = mediaType === "video" || !!videoUrl;
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !mediaUrl) return null;

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
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="relative w-full h-full flex items-center justify-center max-w-7xl max-h-[90vh]">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={imageAlt}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}
