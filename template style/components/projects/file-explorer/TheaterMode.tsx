"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modified?: string;
  extension?: string;
  url?: string;
}

interface TheaterModeProps {
  open: boolean;
  onClose: () => void;
  file: FileItem | null;
  files: FileItem[];
  onPrevious?: () => void;
  onNext?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function TheaterMode({
  open,
  onClose,
  file,
  files,
  onPrevious,
  onNext
}: TheaterModeProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (open && file) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, file]);

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

  if (!open || !file) return null;

  const currentIndex = files.findIndex(f => f.path === file.path);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const isVideo = file.extension && ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(file.extension.toLowerCase());
  const isImage = file.extension && ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(file.extension.toLowerCase());

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

        <div className="relative w-full h-full flex items-center justify-center max-w-7xl max-h-[90vh]">
          {isVideo && file.url ? (
            <video
              ref={videoRef}
              src={file.url}
              className="max-w-full max-h-full object-contain rounded-lg"
              controls
              autoPlay
              loop
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          ) : isImage && file.url ? (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-xl mb-4">No preview available</p>
              <p className="text-white/70">{file.name}</p>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
            <div className="flex items-center gap-4">
              <span className="font-semibold">{file.name}</span>
              {file.size && (
                <span className="text-white/70">
                  {formatFileSize(file.size)}
                </span>
              )}
            </div>
            {file.modified && (
              <p className="text-white/80 text-xs mt-1 text-center">
                Modified: {formatDate(file.modified)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

