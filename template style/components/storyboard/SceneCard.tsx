"use client";

import { StoryboardScene, TransitionType, GenerationStep } from "@/types/storyboard";
import { cn } from "@/lib/utils";
import { Edit, Trash2, ArrowRight, X, Save, Sparkles, Loader2, RefreshCw, Maximize2, FileText, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SceneCardProps {
  scene: StoryboardScene;
  onEditPrompt: (sceneId: string) => void;
  onRegenerate?: (sceneId: string) => void;
  onSave?: (sceneId: string, prompt: string) => void;
  onEnhancePrompt?: (sceneId: string, prompt: string) => Promise<string>;
  onDelete?: (sceneId: string) => void;
  onTransitionSet?: (fromSceneId: string, toSceneId: string, transition: TransitionType) => void;
  onSceneClick?: (sceneId: string) => void;
  onRecreate?: (sceneId: string, type: "image" | "video") => void;
  onMediaClick?: (sceneId: string) => void;
  isFocused?: boolean;
  isDragOver?: boolean;
  nextScene?: StoryboardScene;
  selectedTransition?: TransitionType;
  isRegenerating?: boolean;
  generationStep?: GenerationStep;
  cardHeight?: number;
  totalScenes?: number;
}

function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const transitionLabels: Record<string, string> = {
  'fade-in': 'Fade In',
  'fade-out': 'Fade Out',
  'fade-to-black': 'Fade to Black',
  'crossfade': 'Crossfade',
  'continuous-shot': 'Continuous Shot',
  'none': 'None'
};

const TRANSITION_COLORS: Record<TransitionType, string> = {
  'fade-in': 'bg-blue-500',
  'fade-out': 'bg-purple-500',
  'fade-to-black': 'bg-zinc-700',
  'crossfade': 'bg-green-500',
  'continuous-shot': 'bg-cyan-500',
  'none': 'bg-transparent'
};

export function SceneCard({
  scene,
  onEditPrompt,
  onRegenerate,
  onSave,
  onEnhancePrompt,
  onDelete,
  onTransitionSet,
  onSceneClick,
  onRecreate,
  onMediaClick,
  isFocused = false,
  isDragOver = false,
  nextScene,
  selectedTransition = 'crossfade',
  isRegenerating = false,
  generationStep,
  cardHeight = 400,
  totalScenes
}: SceneCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene.prompt);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video'>('text');
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (generationStep === 'video_generation' || generationStep === 'video_upscale') {
      if (scene.videoUrl) setActiveTab('video');
      else if (scene.thumbnailUrl) setActiveTab('image');
      else setActiveTab('text');
    } else if (generationStep === 'image_generation') {
      if (scene.thumbnailUrl) setActiveTab('image');
      else setActiveTab('text');
    } else {
      setActiveTab('text');
    }
  }, [generationStep, scene.thumbnailUrl, scene.videoUrl]);

  useEffect(() => {
    if (!isEditing) {
      setEditedPrompt(scene.prompt);
      if (contentRef.current && !isEditing) {
        setContentHeight(contentRef.current.offsetHeight);
      }
    }
  }, [scene.prompt, isEditing]);

  useEffect(() => {
    if (!isEditing && contentRef.current) {
      const height = contentRef.current.offsetHeight;
      if (height > 0) {
        setContentHeight(height);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    const loadImageAspectRatio = () => {
      if (!scene.thumbnailUrl || (generationStep !== 'image_generation' && generationStep !== 'video_generation' && generationStep !== 'video_upscale')) {
        setImageAspectRatio(null);
        setCardWidth(null);
        return;
      }

      const img = new Image();
      const calculateWidth = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          setImageAspectRatio(aspectRatio);

          const headerHeight = 60;
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
      img.src = scene.thumbnailUrl;

      if (img.complete && img.naturalWidth > 0) {
        calculateWidth();
      }
    };

    loadImageAspectRatio();
  }, [scene.thumbnailUrl, cardHeight, generationStep]);

  useEffect(() => {
    if (imageAspectRatio !== null) {
      const headerHeight = 60;
      const footerHeight = 50;
      const padding = 48;
      const availableHeight = cardHeight - headerHeight - footerHeight - padding;
      const calculatedWidth = availableHeight * imageAspectRatio;
      setCardWidth(calculatedWidth);
    }
  }, [imageAspectRatio, cardHeight]);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("sceneId", scene.id);
    e.dataTransfer.setData("type", "transition");
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const draggedSceneId = e.dataTransfer.getData("sceneId");
    const type = e.dataTransfer.getData("type");

    if (type === "transition" && draggedSceneId && draggedSceneId !== scene.id && onTransitionSet) {
      onTransitionSet(draggedSceneId, scene.id, selectedTransition);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('button') === null || (e.target as HTMLElement).closest('textarea') === null) {
      onSceneClick?.(scene.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight;
      if (height > 0) {
        setContentHeight(height);
      }
    }
    setIsEditing(true);
    setEditedPrompt(scene.prompt);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedPrompt(scene.prompt);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave && editedPrompt.trim()) {
      onSave(scene.id, editedPrompt.trim());
      setIsEditing(false);
    }
  };

  const handleEnhance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEnhancePrompt && editedPrompt.trim()) {
      setIsEnhancing(true);
      try {
        const enhanced = await onEnhancePrompt(scene.id, editedPrompt.trim());
        setEditedPrompt(enhanced);
      } catch (error) {
        console.error('Failed to enhance prompt:', error);
      } finally {
        setIsEnhancing(false);
      }
    }
  };

  const finalCardWidth = cardWidth !== null && imageAspectRatio !== null
    ? cardWidth
    : 320;

  return (
    <div className="flex items-center gap-2">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleCardClick}
        className={cn(
          "flex-shrink-0 rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 flex flex-col transition-all duration-300 cursor-pointer relative group/card overflow-hidden",
          isFocused && "ring-1 ring-white/50 border-white/50 shadow-2xl shadow-purple-500/20",
          isDragOver && "ring-2 ring-blue-500 border-blue-500",
          isDragging && "opacity-50 scale-95",
          !isFocused && !isDragging && "hover:border-white/20 hover:bg-zinc-900/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
        )}
        style={{
          height: `${cardHeight}px`,
          width: `${finalCardWidth}px`
        }}
      >
        {/* Transitions will be conditionally rendered based on showTransitionsOnCards prop if needed */}
        <div className="flex-1 flex flex-col p-5 min-h-0 relative z-10">
          <div className="flex items-start justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-100 font-medium text-sm shadow-inner">
                {scene.sceneNumber}
              </div>
              {scene.environment !== undefined && (
                <div className="px-2 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-[10px] font-medium text-cyan-200 tracking-wide uppercase">Env {scene.environment}</span>
                </div>
              )}
            </div>
            {scene.transitionOut && (
              <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/50 border border-white/5 px-2 py-1 rounded-full backdrop-blur-sm">
                {transitionLabels[scene.transitionOut] || scene.transitionOut}
              </span>
            )}
          </div>

          <div
            ref={contentRef}
            className={cn(
              "flex-1 flex items-center justify-center mb-4 rounded-lg transition-colors relative overflow-hidden",
              isEditing && "bg-black/40 ring-1 ring-white/20"
            )}
            style={{
              minHeight: 0
            }}
          >
            {isEditing ? (
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full bg-transparent text-white text-center border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/50"
                style={{
                  padding: '0',
                  margin: '0',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  fontWeight: 'inherit',
                  lineHeight: '1.625',
                  letterSpacing: 'inherit',
                  wordSpacing: 'inherit',
                  textAlign: 'center'
                }}
                placeholder="Enter scene prompt..."
              />
            ) : activeTab === 'text' ? (
              <p className="text-zinc-100 text-center leading-relaxed font-light w-full p-4 overflow-y-auto text-sm selection:bg-purple-500/30" style={{ lineHeight: '1.7' }}>
                {scene.prompt}
              </p>
            ) : activeTab === 'image' ? (
              scene.thumbnailUrl ? (
                <div className="w-full h-full relative group">
                  <img
                    ref={imageRef}
                    src={scene.thumbnailUrl}
                    alt={scene.title || `Scene ${scene.sceneNumber}`}
                    className="w-full h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFocused) {
                        onMediaClick?.(scene.id);
                      } else {
                        onSceneClick?.(scene.id);
                      }
                    }}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0 && !imageAspectRatio) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        setImageAspectRatio(aspectRatio);

                        const headerHeight = 60;
                        const footerHeight = 50;
                        const padding = 48;
                        const availableHeight = cardHeight - headerHeight - footerHeight - padding;
                        const calculatedWidth = availableHeight * aspectRatio;
                        setCardWidth(calculatedWidth);
                      }
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {isFocused && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      onMediaClick?.(scene.id);
                    }}>
                      <Maximize2 className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <span className="text-xs">No image available</span>
                </div>
              )
            ) : activeTab === 'video' ? (
              scene.videoUrl || scene.thumbnailUrl ? (
                <div className="w-full h-full relative group">
                  <video
                    src={scene.videoUrl || scene.thumbnailUrl?.replace(/\/images\//, '/videos/').replace(/\.(jpg|png)$/, '.mp4')}
                    className="w-full h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                    controls={false}
                    muted
                    loop
                    playsInline
                    autoPlay
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFocused) {
                        onMediaClick?.(scene.id);
                      } else {
                        onSceneClick?.(scene.id);
                      }
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLVideoElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.video-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="video-fallback hidden absolute inset-0 items-center justify-center">
                    {scene.thumbnailUrl && (
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.title || `Scene ${scene.sceneNumber}`}
                        className="w-full h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFocused) {
                            onMediaClick?.(scene.id);
                          } else {
                            onSceneClick?.(scene.id);
                          }
                        }}
                      />
                    )}
                  </div>
                  {isFocused && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      onMediaClick?.(scene.id);
                    }}>
                      <Maximize2 className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <Video className="w-8 h-8 opacity-50" />
                  <span className="text-xs">No video available</span>
                </div>
              )
            ) : null}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
            <span className="text-zinc-500 text-xs font-mono font-medium tracking-wider">
              {formatTimecode(scene.start)} - {formatTimecode(scene.end)}
            </span>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleEnhance}
                    disabled={isEnhancing || !editedPrompt.trim()}
                    title="Enhance with AI"
                  >
                    {isEnhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleCancel}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleSave}
                    disabled={!editedPrompt.trim() || editedPrompt.trim() === scene.prompt}
                    title="Save"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleEditClick}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onRecreate && (generationStep === 'image_generation' || generationStep === 'video_generation' || generationStep === 'video_upscale') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecreate(scene.id, generationStep === 'image_generation' ? 'image' : 'video');
                      }}
                      title={`Recreate ${generationStep === 'image_generation' ? 'Image' : 'Video'}`}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => onDelete(scene.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* View Buttons - Floating Pill Style */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1 z-20 opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-y-2 group-hover/card:translate-y-0">
            {scene.prompt && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-[10px] font-medium backdrop-blur-md border border-white/10 rounded-full shadow-lg transition-all duration-200",
                  activeTab === 'text'
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-black/60 text-zinc-200 hover:text-white hover:bg-black/80"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('text');
                }}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                Text
              </Button>
            )}
            {scene.thumbnailUrl && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-[10px] font-medium backdrop-blur-md border border-white/10 rounded-full shadow-lg transition-all duration-200",
                  activeTab === 'image'
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-black/60 text-zinc-200 hover:text-white hover:bg-black/80"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('image');
                }}
              >
                <ImageIcon className="h-3 w-3 mr-1.5" />
                Image
              </Button>
            )}
            {scene.videoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-[10px] font-medium backdrop-blur-md border border-white/10 rounded-full shadow-lg transition-all duration-200",
                  activeTab === 'video'
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-black/60 text-zinc-200 hover:text-white hover:bg-black/80"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('video');
                }}
              >
                <Video className="h-3 w-3 mr-1.5" />
                Video
              </Button>
            )}
          </div>
        </div>
      </div>

      {nextScene && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-0.5 bg-zinc-700" />
          <div className="flex items-center gap-1">
            {scene.transitionOut ? (
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                {transitionLabels[scene.transitionOut]}
              </span>
            ) : (
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <div className="w-12 h-0.5 bg-zinc-700" />
        </div>
      )}
    </div>
  );
}

