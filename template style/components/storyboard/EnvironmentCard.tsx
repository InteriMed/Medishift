"use client";

import { Environment, GenerationStep } from "@/types/storyboard";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { PanoramaImageViewer } from "./PanoramaImageViewer";

interface EnvironmentCardProps {
  environment: Environment;
  isFocused?: boolean;
  generationStep?: GenerationStep;
  cardHeight?: number;
  onEnvironmentClick?: (environmentId: number) => void;
  onMediaClick?: (environmentId: number) => void;
}

export function EnvironmentCard({
  environment,
  isFocused = false,
  generationStep,
  cardHeight = 400,
  onEnvironmentClick,
  onMediaClick
}: EnvironmentCardProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const hasText = !!environment.prompt || !!environment.description;
  const hasImage = !!environment.imageUrl;

  useEffect(() => {
    if (!hasImage) {
      setImageAspectRatio(null);
      setCardWidth(null);
      return;
    }

    const img = new Image();
    const calculateWidth = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        setImageAspectRatio(aspectRatio);
        
        const headerHeight = 48;
        const footerHeight = 50;
        const padding = 48;
        const availableHeight = cardHeight - headerHeight - footerHeight - padding;
        const calculatedWidth = availableHeight * aspectRatio;
        setCardWidth(calculatedWidth);
      }
    };

    img.onload = calculateWidth;
    img.onerror = () => {
      setImageAspectRatio(null);
      setCardWidth(null);
    };
    img.src = environment.imageUrl!;

    if (img.complete && img.naturalWidth > 0) {
      calculateWidth();
    }
  }, [environment.imageUrl, cardHeight, hasImage]);

  useEffect(() => {
    if (imageAspectRatio !== null) {
      const headerHeight = 48;
      const footerHeight = 50;
      const padding = 48;
      const availableHeight = cardHeight - headerHeight - footerHeight - padding;
      const calculatedWidth = availableHeight * imageAspectRatio;
      setCardWidth(calculatedWidth);
    }
  }, [imageAspectRatio, cardHeight]);

  useEffect(() => {
    if (generationStep === 'environment_image_generation' && hasImage) {
      setActiveTab('image');
    } else if (hasText) {
      setActiveTab('text');
    } else if (hasImage) {
      setActiveTab('image');
    }
  }, [generationStep, hasText, hasImage]);

  const finalCardWidth = cardWidth !== null && imageAspectRatio !== null 
    ? cardWidth 
    : 320;

  return (
    <div
      draggable={false}
      onClick={() => onEnvironmentClick?.(environment.id)}
      className={cn(
        "relative flex-shrink-0 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-lg border-2 transition-all duration-300 cursor-pointer",
        isFocused
          ? "border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105"
          : "border-zinc-800 hover:border-zinc-700"
      )}
      style={{ 
        height: `${cardHeight}px`,
        width: `${finalCardWidth}px`
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent rounded-t-lg z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{environment.id}</span>
          </div>
          <span className="text-white/90 text-sm font-medium">Environment {environment.id}</span>
        </div>
      </div>

      {/* Content */}
      <div className="w-full h-full flex flex-col p-6 pt-16 min-h-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center rounded transition-colors relative overflow-hidden">
          {activeTab === 'image' && hasImage ? (
            <div className="w-full h-full relative group">
              <PanoramaImageViewer
                imageUrl={environment.imageUrl!}
                alt={`Environment ${environment.id}`}
                className="w-full h-full rounded"
                onImageClick={(e) => {
                  e.stopPropagation();
                  if (isFocused && onMediaClick) {
                    onMediaClick(environment.id);
                  } else {
                    onEnvironmentClick?.(environment.id);
                  }
                }}
                onImageLoad={(img) => {
                  if (img.naturalWidth > 0 && img.naturalHeight > 0 && !imageAspectRatio) {
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    setImageAspectRatio(aspectRatio);
                    
                    const headerHeight = 48;
                    const footerHeight = 50;
                    const padding = 48;
                    const availableHeight = cardHeight - headerHeight - footerHeight - padding;
                    const calculatedWidth = availableHeight * aspectRatio;
                    setCardWidth(calculatedWidth);
                  }
                }}
              />
            </div>
          ) : activeTab === 'text' && hasText ? (
            <p className="text-white text-center leading-relaxed w-full p-2 overflow-y-auto" style={{ lineHeight: '1.625' }}>
              {environment.prompt || environment.description}
            </p>
          ) : (
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{environment.id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-20">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 h-8 text-xs bg-white/10 text-white hover:bg-white/20",
            !hasText && "opacity-50 cursor-not-allowed"
          )}
          disabled={!hasText}
          onClick={(e) => {
            e.stopPropagation();
            if (hasText) {
              setActiveTab('text');
            }
          }}
        >
          <FileText className="h-3 w-3 mr-1" />
          Text
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 h-8 text-xs bg-white/10 text-white hover:bg-white/20",
            !hasImage && "opacity-50 cursor-not-allowed"
          )}
          disabled={!hasImage}
          onClick={(e) => {
            e.stopPropagation();
            if (hasImage) {
              setActiveTab('image');
            }
          }}
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          Image
        </Button>
      </div>
    </div>
  );
}

