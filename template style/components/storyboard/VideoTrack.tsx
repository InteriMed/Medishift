'use client';

import { StoryboardScene } from '@/types/storyboard';
import { cn } from '@/lib/utils';
import { Plus, Upload, FolderOpen, X } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface VideoTrackProps {
  scenes: StoryboardScene[];
  extendedDuration: number;
  timelineWidth: number;
  focusedSceneId?: string;
  draggedSceneId: string | null;
  dragOverIndex: number | null;
  hoverAdjacentIndices?: [number | null, number | null];
  closestBoundary?: 'start' | 'end' | null;
  showSetbackAnimation?: boolean;
  isDragging: boolean;
  onSceneClick: (sceneId: string) => void;
  onSceneDragStart: (
    e: React.DragEvent,
    sceneId: string,
    index: number
  ) => void;
  onSceneDragEnd: () => void;
  onSceneResize?: (sceneId: string, newStart: number, newEnd: number) => void;
  onAddScene?: () => void;
  onSceneMediaDrop?: (
    sceneId: string,
    file: File,
    type: 'image' | 'video'
  ) => void;
  onStepClick?: (
    step:
      | 'prompt_generation'
      | 'environment_generation'
      | 'image_generation'
      | 'video_generation'
      | 'video_upscale'
      | 'video_compose'
  ) => void;
  generationStep?:
    | 'prompt_generation'
    | 'environment_generation'
    | 'image_generation'
    | 'video_generation'
    | 'video_upscale'
    | 'video_compose';
}

export function VideoTrack({
  scenes,
  extendedDuration,
  timelineWidth,
  focusedSceneId,
  draggedSceneId,
  dragOverIndex,
  hoverAdjacentIndices = [null, null],
  closestBoundary = null,
  showSetbackAnimation = false,
  isDragging,
  onSceneClick,
  onSceneDragStart,
  onSceneDragEnd,
  onSceneResize,
  onAddScene,
  onSceneMediaDrop,
  onStepClick,
  generationStep,
}: VideoTrackProps) {
  const [resizingSceneId, setResizingSceneId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | null>(
    null
  );
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartTime, setResizeStartTime] = useState<number>(0);
  const [previewStart, setPreviewStart] = useState<number | null>(null);
  const [previewEnd, setPreviewEnd] = useState<number | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const [showMediaImportOverlay, setShowMediaImportOverlay] = useState(false);
  const [mediaImportSceneId, setMediaImportSceneId] = useState<string | null>(
    null
  );
  const resizeRef = useRef<{
    sceneId: string;
    initialStart: number;
    initialEnd: number;
    handle: 'start' | 'end';
  } | null>(null);

  const handleFileDrop = useCallback(
    (e: React.DragEvent, sceneId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverSceneId(null);

      if (!onSceneMediaDrop) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      const isImage =
        file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isVideo =
        file.type.startsWith('video/') ||
        /\.(mp4|mov|avi|webm)$/i.test(file.name);

      if (isImage) {
        onSceneMediaDrop(sceneId, file, 'image');
      } else if (isVideo) {
        onSceneMediaDrop(sceneId, file, 'video');
      }
    },
    [onSceneMediaDrop]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, sceneId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Only show drop indicator if dragging files (not scenes)
      const hasFiles = e.dataTransfer.types.includes('Files');
      if (hasFiles && !isDragging) {
        setDragOverSceneId(sceneId);
      }
    },
    [isDragging]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSceneId(null);
  }, []);

  const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, sceneId: string, handle: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();

      const scene = sortedScenes.find(s => s.id === sceneId);
      if (!scene || !onSceneResize) return;

      setResizingSceneId(sceneId);
      setResizeHandle(handle);
      setResizeStartX(e.clientX);
      setResizeStartTime(handle === 'start' ? scene.start : scene.end);
      setPreviewStart(null);
      setPreviewEnd(null);

      resizeRef.current = {
        sceneId,
        initialStart: scene.start,
        initialEnd: scene.end,
        handle,
      };
    },
    [sortedScenes, onSceneResize]
  );

  useEffect(() => {
    if (
      !resizingSceneId ||
      !resizeHandle ||
      !resizeRef.current ||
      !onSceneResize
    )
      return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const currentSortedScenes = [...scenes].sort((a, b) => a.start - b.start);
      const deltaX = e.clientX - resizeStartX;
      const pixelsPerSecond = timelineWidth / extendedDuration;
      const deltaTime = deltaX / pixelsPerSecond;

      const sceneIndex = currentSortedScenes.findIndex(
        s => s.id === resizingSceneId
      );
      if (sceneIndex === -1) return;

      const scene = currentSortedScenes[sceneIndex];
      const prevScene =
        sceneIndex > 0 ? currentSortedScenes[sceneIndex - 1] : null;

      let newStart = scene.start;
      let newEnd = scene.end;

      if (resizeHandle === 'start') {
        const minStart = prevScene ? prevScene.end : 0;
        newStart = resizeStartTime + deltaTime;
        newStart = Math.max(minStart, newStart);
        newStart = Math.min(newStart, scene.end - 0.1);
        setPreviewStart(newStart);
        setPreviewEnd(null);
      } else {
        newEnd = resizeStartTime + deltaTime;
        newEnd = Math.max(scene.start + 0.1, newEnd);
        newEnd = Math.min(newEnd, extendedDuration);
        setPreviewStart(null);
        setPreviewEnd(newEnd);
      }
    };

    const handleMouseUp = () => {
      if (resizeRef.current && onSceneResize) {
        const currentSortedScenes = [...scenes].sort(
          (a, b) => a.start - b.start
        );
        const scene = currentSortedScenes.find(s => s.id === resizingSceneId);

        if (scene) {
          const finalStart = previewStart !== null ? previewStart : scene.start;
          const finalEnd = previewEnd !== null ? previewEnd : scene.end;

          if (finalStart !== scene.start || finalEnd !== scene.end) {
            onSceneResize(resizingSceneId, finalStart, finalEnd);
          }
        }
      }

      setResizingSceneId(null);
      setResizeHandle(null);
      setPreviewStart(null);
      setPreviewEnd(null);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    resizingSceneId,
    resizeHandle,
    resizeStartX,
    resizeStartTime,
    timelineWidth,
    extendedDuration,
    scenes,
    onSceneResize,
    previewStart,
    previewEnd,
  ]);

  const insertionLinePosition =
    isDragging && dragOverIndex !== null && closestBoundary
      ? (() => {
          const targetScene = sortedScenes[dragOverIndex];
          if (!targetScene) return null;

          if (closestBoundary === 'start') {
            return (targetScene.start / extendedDuration) * timelineWidth;
          } else if (closestBoundary === 'end') {
            return (targetScene.end / extendedDuration) * timelineWidth;
          }
          return null;
        })()
      : null;

  return (
    <div
      className="relative bg-zinc-900 rounded-lg border border-zinc-800/50 flex flex-col"
      style={{ width: `${timelineWidth}px`, height: '88px' }}
    >
      {/* Scene Content Area - Centered with padding for hover state (h-20 = 80px + padding) */}
      <div
        className="ml-20 relative flex items-center"
        style={{ height: '88px', paddingTop: '4px', paddingBottom: '4px' }}
      >
        {/* Insertion Line */}
        {insertionLinePosition !== null && (
          <div
            className="absolute top-0 bottom-0 z-50 pointer-events-none"
            style={{
              left: `${insertionLinePosition - 1}px`,
              width: '2px',
              backgroundImage:
                'radial-gradient(circle, rgb(96, 165, 250) 2px, transparent 2px)',
              backgroundSize: '2px 10px',
              backgroundRepeat: 'repeat-y',
              backgroundPosition: 'center',
              opacity: 1,
              boxShadow:
                '0 0 8px rgba(96, 165, 250, 0.8), 0 0 4px rgba(96, 165, 250, 0.4)',
            }}
          />
        )}
        {sortedScenes.map((scene, index) => {
          const isFocused = focusedSceneId === scene.id;
          const isDragged = draggedSceneId === scene.id;
          const isDragOver = dragOverIndex === index && isDragging;
          const isHoverAdjacent =
            isDragging &&
            !isDragged &&
            (hoverAdjacentIndices[0] === index ||
              hoverAdjacentIndices[1] === index);
          const isResizing = resizingSceneId === scene.id;
          const displayStart =
            isResizing && previewStart !== null ? previewStart : scene.start;
          const displayEnd =
            isResizing && previewEnd !== null ? previewEnd : scene.end;
          const displayDuration = displayEnd - displayStart;
          const isLastScene = index === sortedScenes.length - 1;
          const nextScene = !isLastScene ? sortedScenes[index + 1] : null;
          const prevScene = index > 0 ? sortedScenes[index - 1] : null;

          const focusedScene = focusedSceneId
            ? sortedScenes.find(s => s.id === focusedSceneId)
            : null;
          const focusedEnvironmentId = focusedScene?.environment;
          const sharesEnvironment =
            focusedEnvironmentId !== undefined &&
            scene.environment !== undefined &&
            scene.environment === focusedEnvironmentId;
          const shouldDarken =
            focusedEnvironmentId !== undefined &&
            (scene.environment === undefined ||
              scene.environment !== focusedEnvironmentId) &&
            !isFocused;

          return (
            <div key={scene.id}>
              <div
                draggable
                onDragStart={e => onSceneDragStart(e, scene.id, index)}
                onDragEnd={onSceneDragEnd}
                onDrop={e => handleFileDrop(e, scene.id)}
                onDragOver={e => handleDragOver(e, scene.id)}
                onDragLeave={handleDragLeave}
                className={cn(
                  'absolute cursor-move transition-all duration-200 flex items-center justify-center text-white text-xs font-semibold rounded-lg group',
                  isFocused
                    ? 'bg-zinc-700/80 border-2 border-white shadow-lg shadow-white/10'
                    : scene.status === 'approved'
                      ? 'bg-zinc-800/60 border border-zinc-700/50'
                      : 'bg-zinc-800/40 border border-zinc-700/30',
                  shouldDarken && 'opacity-30 brightness-50',
                  isDragged && !showSetbackAnimation
                    ? 'opacity-50 z-40 scale-95'
                    : isDragging
                      ? 'h-16'
                      : 'h-16 hover:!h-20 hover:border-zinc-600',
                  isHoverAdjacent && dragOverIndex !== null && '!h-20',
                  showSetbackAnimation &&
                    isDragged &&
                    'opacity-100 z-40 scale-100 transition-all duration-300 ease-out',
                  isResizing && 'opacity-50',
                  dragOverSceneId === scene.id &&
                    !isDragging &&
                    'border-2 border-blue-500 bg-blue-500/20'
                )}
                style={{
                  left: `${(scene.start / extendedDuration) * timelineWidth}px`,
                  width: `${Math.max(0, ((scene.end - scene.start) / extendedDuration) * timelineWidth)}px`,
                  minWidth: `${Math.max(2, ((scene.end - scene.start) / extendedDuration) * timelineWidth)}px`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  if (onStepClick) {
                    if (generationStep === 'video_upscale') {
                      onStepClick('video_upscale');
                    } else if (generationStep === 'video_generation') {
                      onStepClick('video_generation');
                    } else if (generationStep === 'image_generation') {
                      onStepClick('image_generation');
                    } else if (generationStep === 'environment_generation') {
                      onStepClick('environment_generation');
                    } else {
                      onStepClick('prompt_generation');
                    }
                  }
                }}
                onClick={e => {
                  e.stopPropagation();
                  onSceneClick(scene.id);
                }}
              >
                {onSceneResize && (
                  <>
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-50 opacity-0 group-hover:opacity-100 transition-opacity',
                        resizingSceneId === scene.id &&
                          resizeHandle === 'start' &&
                          'opacity-100 bg-blue-500'
                      )}
                      onMouseDown={e => handleResizeStart(e, scene.id, 'start')}
                      style={{
                        borderTopLeftRadius: '8px',
                        borderBottomLeftRadius: '8px',
                      }}
                    />
                    <div
                      className={cn(
                        'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-50 opacity-0 group-hover:opacity-100 transition-opacity',
                        resizingSceneId === scene.id &&
                          resizeHandle === 'end' &&
                          'opacity-100 bg-blue-500'
                      )}
                      onMouseDown={e => handleResizeStart(e, scene.id, 'end')}
                      style={{
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                      }}
                    />
                  </>
                )}
                <div className="flex items-center justify-center w-full h-full px-2 relative">
                  {scene.environment !== undefined && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {scene.environment}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-bold absolute left-1/2 transform -translate-x-1/2">
                    {scene.sceneNumber}
                  </span>
                  {onSceneMediaDrop && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setMediaImportSceneId(scene.id);
                        setShowMediaImportOverlay(true);
                      }}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white border-2 border-dashed border-zinc-600 hover:border-zinc-500 transition-all duration-200 hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100 z-10"
                      title="Add media to scene"
                    >
                      <Plus className="w-5 h-5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
              {isResizing && (previewStart !== null || previewEnd !== null) && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20 rounded-lg z-50 pointer-events-none"
                  style={{
                    left: `${(displayStart / extendedDuration) * timelineWidth}px`,
                    width: `${Math.max(0, (displayDuration / extendedDuration) * timelineWidth)}px`,
                    minWidth: `${Math.max(2, (displayDuration / extendedDuration) * timelineWidth)}px`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '64px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Media Import Overlay - Full Screen */}
      {showMediaImportOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => {
            setShowMediaImportOverlay(false);
            setMediaImportSceneId(null);
          }}
        >
          <div
            className="w-full h-full flex flex-col items-center justify-center p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full max-w-4xl mb-8">
              <h3 className="text-white text-2xl font-semibold">Add Media</h3>
              <button
                onClick={() => {
                  setShowMediaImportOverlay(false);
                  setMediaImportSceneId(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {mediaImportSceneId && (
              <p className="text-sm text-zinc-400 mb-8">
                Adding media to scene{' '}
                {sortedScenes.find(s => s.id === mediaImportSceneId)
                  ?.sceneNumber || ''}
              </p>
            )}

            <div className="flex items-center justify-center gap-8 max-w-4xl w-full">
              {/* Import from Device */}
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,video/*';
                  input.multiple = false;
                  input.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file && mediaImportSceneId && onSceneMediaDrop) {
                      const isImage =
                        file.type.startsWith('image/') ||
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                      const isVideo =
                        file.type.startsWith('video/') ||
                        /\.(mp4|mov|avi|webm)$/i.test(file.name);
                      if (isImage) {
                        onSceneMediaDrop(mediaImportSceneId, file, 'image');
                      } else if (isVideo) {
                        onSceneMediaDrop(mediaImportSceneId, file, 'video');
                      }
                      setShowMediaImportOverlay(false);
                      setMediaImportSceneId(null);
                    }
                  };
                  input.click();
                }}
                className="flex-1 max-w-xs aspect-square bg-zinc-800 hover:bg-zinc-700 rounded-lg border-2 border-zinc-700 hover:border-zinc-600 flex flex-col items-center justify-center gap-4 text-white transition-all duration-200 hover:scale-105"
              >
                <Upload className="w-16 h-16" strokeWidth={1.5} />
                <span className="text-lg font-medium">Import from Device</span>
              </button>

              {/* Choose from Library */}
              <button
                onClick={() => {
                  // TODO: Open library/modal for choosing from existing media
                  setShowMediaImportOverlay(false);
                  setMediaImportSceneId(null);
                }}
                className="flex-1 max-w-xs aspect-square bg-zinc-800 hover:bg-zinc-700 rounded-lg border-2 border-zinc-700 hover:border-zinc-600 flex flex-col items-center justify-center gap-4 text-white transition-all duration-200 hover:scale-105"
              >
                <FolderOpen className="w-16 h-16" strokeWidth={1.5} />
                <span className="text-lg font-medium">Choose from Library</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
