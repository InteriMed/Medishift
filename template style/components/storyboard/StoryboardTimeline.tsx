'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  StoryboardScene,
  AudioTrack,
  TransitionType,
  GenerationStep,
} from '@/types/storyboard';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Volume2,
  HelpCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VideoTrack } from './VideoTrack';
import { TransitionsTrack } from './TransitionsTrack';
import { SoundTrack } from './SoundTrack';

interface StoryboardTimelineProps {
  scenes: StoryboardScene[];
  totalDuration: number;
  onSceneClick: (sceneId: string) => void;
  onSceneReorder?: (fromIndex: number, toIndex: number) => void;
  onSceneResize?: (sceneId: string, newStart: number, newEnd: number) => void;
  onAddScene?: () => void;
  onSceneMediaDrop?: (
    sceneId: string,
    file: File,
    type: 'image' | 'video'
  ) => void;
  onStepClick?: (step: GenerationStep) => void;
  focusedSceneId?: string;
  zoomLevel?: number;
  currentTime?: number;
  onTimeChange?: (time: number) => void;
  audioTracks?: AudioTrack[];
  onTrackAdd?: () => void;
  onTrackDelete?: (trackId: string) => void;
  selectedTransition?: TransitionType;
  onTransitionSet?: (
    sceneId: string,
    transition: TransitionType,
    position: 'start' | 'end'
  ) => void;
  onTransitionRemove?: (sceneId: string, position: 'start' | 'end') => void;
  onTransitionSetAll?: (transition: TransitionType) => void;
  showTransitionsOnCards?: boolean;
  generationStep?: GenerationStep;
}

function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
}

const TRANSITION_COLORS: Record<TransitionType, string> = {
  'fade-in': 'bg-blue-500',
  'fade-out': 'bg-purple-500',
  crossfade: 'bg-green-500',
  'fade-to-black': 'bg-zinc-700',
  'continuous-shot': 'bg-cyan-500',
  none: 'bg-transparent',
};

export function StoryboardTimeline({
  scenes,
  totalDuration,
  onSceneClick,
  onSceneReorder,
  onSceneResize,
  onAddScene,
  onSceneMediaDrop,
  onStepClick,
  focusedSceneId,
  zoomLevel = 1,
  currentTime = 0,
  onTimeChange,
  audioTracks = [],
  onTrackAdd,
  onTrackDelete,
  selectedTransition,
  onTransitionSet,
  onTransitionRemove,
  onTransitionSetAll,
  isPlaying = false,
  showTransitionsOnCards = true,
  generationStep,
}: StoryboardTimelineProps & {
  isPlaying?: boolean;
  showTransitionsOnCards?: boolean;
}) {
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const [draggedOriginalIndex, setDraggedOriginalIndex] = useState<
    number | null
  >(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoverAdjacentIndices, setHoverAdjacentIndices] = useState<
    [number | null, number | null]
  >([null, null]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSetbackAnimation, setShowSetbackAnimation] = useState(false);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [rulerScrollLeft, setRulerScrollLeft] = useState<number>(0);
  const [closestBoundary, setClosestBoundary] = useState<
    'start' | 'end' | null
  >(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeRulerRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<number>(0);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const currentMouseX = useRef<number>(0);

  const BASE_PIXELS_PER_SECOND = 100;
  const ZOOM_100_PERCENT_SECONDS = 120;

  useEffect(() => {
    const updateContainerWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    const resizeObserver = new ResizeObserver(updateContainerWidth);

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateContainerWidth);
      resizeObserver.disconnect();
    };
  }, []);

  const sceneEnds = scenes.length > 0 ? scenes.map(s => s.end) : [];
  const trackEnds = audioTracks.length > 0 ? audioTracks.map(t => t.end) : [];
  const allEnds = [...sceneEnds, ...trackEnds, totalDuration];
  const maxTrackEnd = allEnds.length > 0 ? Math.max(...allEnds) : totalDuration;
  const extendedDuration = maxTrackEnd + 30;

  const effectiveZoomLevel =
    zoomLevel === 0
      ? containerWidth > 0
        ? Math.max(
          0.1,
          (containerWidth - 80) / (extendedDuration * BASE_PIXELS_PER_SECOND)
        )
        : 1
      : zoomLevel;

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * (effectiveZoomLevel / 10);
  const visibleDuration =
    effectiveZoomLevel > 0
      ? ZOOM_100_PERCENT_SECONDS / (effectiveZoomLevel / 10)
      : extendedDuration;
  const timelineWidth = extendedDuration * pixelsPerSecond;

  const handleDragStart = useCallback(
    (e: React.DragEvent, sceneId: string, index: number) => {
      setDraggedSceneId(sceneId);
      setDraggedOriginalIndex(index);
      setIsDragging(true);
      setShowSetbackAnimation(false);
      currentMouseX.current = e.clientX;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sceneId);

      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const sceneRect = e.currentTarget.getBoundingClientRect();
        dragOffset.current = e.clientX - sceneRect.left;
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        currentMouseX.current = moveEvent.clientX;
      };

      document.addEventListener('mousemove', handleMouseMove);

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mouseup', handleMouseUp);
    },
    []
  );

  const updateTimeFromMousePosition = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!onTimeChange || !timeRulerRef.current || !timelineRef.current)
        return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timeRulerRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const labelWidth = 80;

      if (x < labelWidth) return;

      const clickedTime = ((x - labelWidth) / timelineWidth) * extendedDuration;
      const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
      onTimeChange(clampedTime);
    },
    [totalDuration, extendedDuration, timelineWidth, onTimeChange]
  );

  const handlePlayBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timeRulerRef.current) return;

      const rect = timeRulerRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const rulerHeight = rect.height;
      const scrollbarHeight = 17;

      if (clickY > rulerHeight - scrollbarHeight) {
        return;
      }

      updateTimeFromMousePosition(e);
    },
    [updateTimeFromMousePosition]
  );

  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onTimeChange || !timeRulerRef.current) return;

      const rect = timeRulerRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const rulerHeight = rect.height;
      const scrollbarHeight = 17;

      if (clickY > rulerHeight - scrollbarHeight) {
        return;
      }

      e.preventDefault();
      setIsDraggingTimeline(true);
      updateTimeFromMousePosition(e);
    },
    [onTimeChange, updateTimeFromMousePosition]
  );

  const handleTimelineMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingTimeline) return;
      updateTimeFromMousePosition(e);
    },
    [isDraggingTimeline, updateTimeFromMousePosition]
  );

  const handleTimelineMouseUp = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  const handlePlayBarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTime(true);
  }, []);

  const handlePlayBarDrag = useCallback(
    (e: MouseEvent) => {
      if (
        !isDraggingTime ||
        !onTimeChange ||
        !timeRulerRef.current ||
        !timelineRef.current
      )
        return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timeRulerRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const labelWidth = 80; // Width of label section

      // Constrain to timeline area (beyond label section)
      const adjustedX = Math.max(labelWidth, x);

      const draggedTime =
        ((adjustedX - labelWidth) / timelineWidth) * extendedDuration;
      const clampedTime = Math.max(0, Math.min(totalDuration, draggedTime));
      onTimeChange(clampedTime);
    },
    [
      isDraggingTime,
      totalDuration,
      extendedDuration,
      timelineWidth,
      onTimeChange,
    ]
  );

  const handlePlayBarDragEnd = useCallback(() => {
    setIsDraggingTime(false);
  }, []);

  useEffect(() => {
    if (isDraggingTime) {
      document.addEventListener('mousemove', handlePlayBarDrag);
      document.addEventListener('mouseup', handlePlayBarDragEnd);
      return () => {
        document.removeEventListener('mousemove', handlePlayBarDrag);
        document.removeEventListener('mouseup', handlePlayBarDragEnd);
      };
    }
  }, [isDraggingTime, handlePlayBarDrag, handlePlayBarDragEnd]);

  useEffect(() => {
    if (isDraggingTimeline) {
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleTimelineMouseMove);
        document.removeEventListener('mouseup', handleTimelineMouseUp);
      };
    }
  }, [isDraggingTimeline, handleTimelineMouseMove, handleTimelineMouseUp]);

  useEffect(() => {
    if (timeRulerRef.current && timelineRef.current) {
      const playBarPosition = (currentTime / extendedDuration) * timelineWidth;
      const containerWidth = timeRulerRef.current.clientWidth;
      const scrollLeft = timeRulerRef.current.scrollLeft;
      const playBarInView =
        playBarPosition >= scrollLeft &&
        playBarPosition <= scrollLeft + containerWidth;

      if (!playBarInView && !isDraggingTime && timelineWidth > 0) {
        const newScrollLeft = Math.max(0, playBarPosition - containerWidth / 2);
        timeRulerRef.current.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth',
        });
      }
    }
  }, [
    currentTime,
    totalDuration,
    extendedDuration,
    timelineWidth,
    isDraggingTime,
  ]);

  useEffect(() => {
    if (
      !focusedSceneId ||
      !timeRulerRef.current ||
      !scrollContainerRef.current ||
      timelineWidth <= 0 ||
      pixelsPerSecond <= 0 ||
      extendedDuration <= 0
    ) {
      return;
    }

    const focusedScene = scenes.find(s => s.id === focusedSceneId);
    if (!focusedScene) {
      return;
    }

    const centerTimelineScene = () => {
      if (!timeRulerRef.current || !scrollContainerRef.current) return;

      const LABEL_WIDTH = 80;

      const sceneStartTime = focusedScene.start;
      const sceneEndTime = focusedScene.end;
      const sceneCenterTime = (sceneStartTime + sceneEndTime) / 2;

      const sceneCenterPositionInPixels = sceneCenterTime * pixelsPerSecond;

      const containerWidth = scrollContainerRef.current.clientWidth;

      const sceneCenterWithLabel = LABEL_WIDTH + sceneCenterPositionInPixels;
      const targetScrollLeft = sceneCenterWithLabel - containerWidth / 2;

      const maxScrollLeft = Math.max(
        0,
        timeRulerRef.current.scrollWidth - timeRulerRef.current.clientWidth
      );
      const clampedScrollLeft = Math.max(
        0,
        Math.min(targetScrollLeft, maxScrollLeft)
      );

      timeRulerRef.current.scrollTo({
        left: clampedScrollLeft,
        behavior: 'smooth',
      });
    };

    requestAnimationFrame(() => {
      setTimeout(centerTimelineScene, 50);
    });
  }, [
    focusedSceneId,
    scenes,
    pixelsPerSecond,
    timelineWidth,
    extendedDuration,
    effectiveZoomLevel,
  ]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!scrollContainerRef.current || !draggedSceneId) return;

      const LABEL_WIDTH = 80;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX;
      const containerLeft = rect.left;
      const containerRight = rect.right;
      const containerWidth = rect.width;

      const SCROLL_THRESHOLD = 100;
      const SCROLL_SPEED = 10;

      currentMouseX.current = mouseX;
      const distanceFromLeft = mouseX - containerLeft;
      const distanceFromRight = containerRight - mouseX;

      if (distanceFromLeft < SCROLL_THRESHOLD && distanceFromLeft > 0) {
        if (autoScrollIntervalRef.current) {
          cancelAnimationFrame(autoScrollIntervalRef.current);
        }
        const scrollLeft = () => {
          if (
            scrollContainerRef.current &&
            timeRulerRef.current &&
            isDragging
          ) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const currentMouse = currentMouseX.current;
            const currentDistanceFromLeft = currentMouse - rect.left;

            if (
              currentDistanceFromLeft < SCROLL_THRESHOLD &&
              currentDistanceFromLeft > 0
            ) {
              const currentScrollAmount =
                SCROLL_SPEED * (1 - currentDistanceFromLeft / SCROLL_THRESHOLD);
              const newScrollLeft = Math.max(
                0,
                timeRulerRef.current.scrollLeft - currentScrollAmount
              );
              timeRulerRef.current.scrollLeft = newScrollLeft;
              autoScrollIntervalRef.current = requestAnimationFrame(scrollLeft);
            } else {
              autoScrollIntervalRef.current = null;
            }
          } else {
            autoScrollIntervalRef.current = null;
          }
        };
        autoScrollIntervalRef.current = requestAnimationFrame(scrollLeft);
      } else if (
        distanceFromRight < SCROLL_THRESHOLD &&
        distanceFromRight > 0
      ) {
        if (autoScrollIntervalRef.current) {
          cancelAnimationFrame(autoScrollIntervalRef.current);
        }
        const scrollRight = () => {
          if (
            scrollContainerRef.current &&
            timeRulerRef.current &&
            isDragging
          ) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            const currentMouse = currentMouseX.current;
            const currentDistanceFromRight = rect.right - currentMouse;

            if (
              currentDistanceFromRight < SCROLL_THRESHOLD &&
              currentDistanceFromRight > 0
            ) {
              const currentScrollAmount =
                SCROLL_SPEED *
                (1 - currentDistanceFromRight / SCROLL_THRESHOLD);
              const maxScroll =
                timeRulerRef.current.scrollWidth -
                timeRulerRef.current.clientWidth;
              const newScrollLeft = Math.min(
                maxScroll,
                timeRulerRef.current.scrollLeft + currentScrollAmount
              );
              timeRulerRef.current.scrollLeft = newScrollLeft;
              autoScrollIntervalRef.current =
                requestAnimationFrame(scrollRight);
            } else {
              autoScrollIntervalRef.current = null;
            }
          } else {
            autoScrollIntervalRef.current = null;
          }
        };
        autoScrollIntervalRef.current = requestAnimationFrame(scrollRight);
      } else {
        if (autoScrollIntervalRef.current) {
          cancelAnimationFrame(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
      }

      const rawX = e.clientX - containerLeft + rulerScrollLeft;
      const x = rawX - LABEL_WIDTH;

      if (x < 0) return;

      const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);
      const draggedIndex = sortedScenes.findIndex(s => s.id === draggedSceneId);

      const currentEffectiveZoom =
        zoomLevel === 0
          ? containerWidth > 0
            ? Math.max(
              0.1,
              (containerWidth - LABEL_WIDTH) /
              (extendedDuration * BASE_PIXELS_PER_SECOND)
            )
            : 1
          : zoomLevel;

      const pixelsPerSecond =
        BASE_PIXELS_PER_SECOND * (currentEffectiveZoom / 10);
      const magnetThresholdSeconds = 0.5;
      const magnetThreshold = magnetThresholdSeconds * pixelsPerSecond;

      let closestIndex = draggedIndex;
      let minDistance = Infinity;
      let closestBoundaryType: 'start' | 'end' | null = null;

      sortedScenes.forEach((scene, index) => {
        if (index === draggedIndex) return;

        const sceneDuration = scene.end - scene.start;
        const sceneLeft = (scene.start / extendedDuration) * timelineWidth;
        const sceneWidth = (sceneDuration / extendedDuration) * timelineWidth;
        const sceneRight = sceneLeft + sceneWidth;

        const distanceToStart = Math.abs(x - sceneLeft);
        const distanceToEnd = Math.abs(x - sceneRight);
        const closestBoundaryDist = Math.min(distanceToStart, distanceToEnd);

        if (
          closestBoundaryDist < minDistance &&
          closestBoundaryDist < magnetThreshold
        ) {
          minDistance = closestBoundaryDist;
          closestIndex = index;
          closestBoundaryType =
            distanceToStart < distanceToEnd ? 'start' : 'end';
        }
      });

      if (closestIndex !== draggedIndex) {
        const sortedScenesForComparison = [...scenes].sort(
          (a, b) => a.start - b.start
        );
        const originalIndex = sortedScenesForComparison.findIndex(
          s => s.id === draggedSceneId
        );

        if (closestIndex === originalIndex) {
          setDragOverIndex(null);
          setHoverAdjacentIndices([null, null]);
          setClosestBoundary(null);
        } else {
          const prevSceneIndex = originalIndex > 0 ? originalIndex - 1 : null;
          const nextSceneIndex =
            originalIndex < sortedScenesForComparison.length - 1
              ? originalIndex + 1
              : null;

          let isInMiddleZone = false;

          if (prevSceneIndex !== null && nextSceneIndex !== null) {
            const prevScene = sortedScenesForComparison[prevSceneIndex];
            const nextScene = sortedScenesForComparison[nextSceneIndex];

            const prevSceneDuration = prevScene.end - prevScene.start;
            const prevSceneLeft =
              (prevScene.start / extendedDuration) * timelineWidth;
            const prevSceneWidth =
              (prevSceneDuration / extendedDuration) * timelineWidth;
            const prevSceneMidpoint = prevSceneLeft + prevSceneWidth / 2;

            const nextSceneDuration = nextScene.end - nextScene.start;
            const nextSceneLeft =
              (nextScene.start / extendedDuration) * timelineWidth;
            const nextSceneWidth =
              (nextSceneDuration / extendedDuration) * timelineWidth;
            const nextSceneMidpoint = nextSceneLeft + nextSceneWidth / 2;

            if (x >= prevSceneMidpoint && x <= nextSceneMidpoint) {
              isInMiddleZone = true;
            }
          }

          if (isInMiddleZone) {
            setDragOverIndex(null);
            setHoverAdjacentIndices([null, null]);
            setClosestBoundary(null);
          } else {
            setDragOverIndex(closestIndex);
            setClosestBoundary(closestBoundaryType);

            if (closestBoundaryType === 'start') {
              const prevIndex = closestIndex > 0 ? closestIndex - 1 : null;
              setHoverAdjacentIndices([prevIndex, closestIndex]);
            } else if (closestBoundaryType === 'end') {
              const nextIndex =
                closestIndex < sortedScenes.length - 1
                  ? closestIndex + 1
                  : null;
              setHoverAdjacentIndices([closestIndex, nextIndex]);
            } else {
              setHoverAdjacentIndices([null, null]);
            }
          }
        }
      } else {
        let bestIndex = draggedIndex;
        let bestDistance = Infinity;
        let bestBoundaryType: 'start' | 'end' | null = null;

        sortedScenes.forEach((scene, index) => {
          if (index === draggedIndex) return;

          const sceneDuration = scene.end - scene.start;
          const sceneLeft = (scene.start / extendedDuration) * timelineWidth;
          const sceneWidth = (sceneDuration / extendedDuration) * timelineWidth;
          const sceneRight = sceneLeft + sceneWidth;

          const distanceToStart = Math.abs(x - sceneLeft);
          const distanceToEnd = Math.abs(x - sceneRight);
          const closestBoundaryDist = Math.min(distanceToStart, distanceToEnd);

          if (closestBoundaryDist < bestDistance) {
            bestDistance = closestBoundaryDist;
            bestIndex = index;
            bestBoundaryType =
              distanceToStart < distanceToEnd ? 'start' : 'end';
          }
        });

        if (bestIndex !== draggedIndex) {
          const sortedScenesForComparison = [...scenes].sort(
            (a, b) => a.start - b.start
          );
          const originalIndex = sortedScenesForComparison.findIndex(
            s => s.id === draggedSceneId
          );

          if (bestIndex === originalIndex) {
            setDragOverIndex(null);
            setHoverAdjacentIndices([null, null]);
            setClosestBoundary(null);
          } else {
            const prevSceneIndex = originalIndex > 0 ? originalIndex - 1 : null;
            const nextSceneIndex =
              originalIndex < sortedScenesForComparison.length - 1
                ? originalIndex + 1
                : null;

            let isInMiddleZone = false;

            if (prevSceneIndex !== null && nextSceneIndex !== null) {
              const prevScene = sortedScenesForComparison[prevSceneIndex];
              const nextScene = sortedScenesForComparison[nextSceneIndex];

              const prevSceneDuration = prevScene.end - prevScene.start;
              const prevSceneLeft =
                (prevScene.start / extendedDuration) * timelineWidth;
              const prevSceneWidth =
                (prevSceneDuration / extendedDuration) * timelineWidth;
              const prevSceneMidpoint = prevSceneLeft + prevSceneWidth / 2;

              const nextSceneDuration = nextScene.end - nextScene.start;
              const nextSceneLeft =
                (nextScene.start / extendedDuration) * timelineWidth;
              const nextSceneWidth =
                (nextSceneDuration / extendedDuration) * timelineWidth;
              const nextSceneMidpoint = nextSceneLeft + nextSceneWidth / 2;

              if (x >= prevSceneMidpoint && x <= nextSceneMidpoint) {
                isInMiddleZone = true;
              }
            }

            if (isInMiddleZone) {
              setDragOverIndex(null);
              setHoverAdjacentIndices([null, null]);
              setClosestBoundary(null);
            } else {
              setDragOverIndex(bestIndex);
              setClosestBoundary(bestBoundaryType);

              if (bestBoundaryType === 'start') {
                const prevIndex = bestIndex > 0 ? bestIndex - 1 : null;
                setHoverAdjacentIndices([prevIndex, bestIndex]);
              } else if (bestBoundaryType === 'end') {
                const nextIndex =
                  bestIndex < sortedScenes.length - 1 ? bestIndex + 1 : null;
                setHoverAdjacentIndices([bestIndex, nextIndex]);
              } else {
                setHoverAdjacentIndices([null, null]);
              }
            }
          }
        } else {
          const sortedScenesForComparison = [...scenes].sort(
            (a, b) => a.start - b.start
          );
          const originalIndex = sortedScenesForComparison.findIndex(
            s => s.id === draggedSceneId
          );

          const prevSceneIndex = originalIndex > 0 ? originalIndex - 1 : null;
          const nextSceneIndex =
            originalIndex < sortedScenesForComparison.length - 1
              ? originalIndex + 1
              : null;

          let isInMiddleZone = false;

          if (prevSceneIndex !== null && nextSceneIndex !== null) {
            const prevScene = sortedScenesForComparison[prevSceneIndex];
            const nextScene = sortedScenesForComparison[nextSceneIndex];

            const prevSceneDuration = prevScene.end - prevScene.start;
            const prevSceneLeft =
              (prevScene.start / extendedDuration) * timelineWidth;
            const prevSceneWidth =
              (prevSceneDuration / extendedDuration) * timelineWidth;
            const prevSceneMidpoint = prevSceneLeft + prevSceneWidth / 2;

            const nextSceneDuration = nextScene.end - nextScene.start;
            const nextSceneLeft =
              (nextScene.start / extendedDuration) * timelineWidth;
            const nextSceneWidth =
              (nextSceneDuration / extendedDuration) * timelineWidth;
            const nextSceneMidpoint = nextSceneLeft + nextSceneWidth / 2;

            if (x >= prevSceneMidpoint && x <= nextSceneMidpoint) {
              isInMiddleZone = true;
            }
          }

          if (isInMiddleZone) {
            setDragOverIndex(null);
            setHoverAdjacentIndices([null, null]);
            setClosestBoundary(null);
          } else {
            setHoverAdjacentIndices([null, null]);
            setDragOverIndex(null);
            setClosestBoundary(null);
          }
        }
      }
    },
    [
      draggedSceneId,
      scenes,
      totalDuration,
      extendedDuration,
      timelineWidth,
      zoomLevel,
      containerWidth,
      rulerScrollLeft,
      isDragging,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      if (!draggedSceneId || !onSceneReorder) {
        if (draggedOriginalIndex !== null) {
          setShowSetbackAnimation(true);
          setTimeout(() => {
            setShowSetbackAnimation(false);
            setDraggedSceneId(null);
            setDraggedOriginalIndex(null);
            setDragOverIndex(null);
            setHoverAdjacentIndices([null, null]);
            setIsDragging(false);
          }, 300);
        } else {
          setDraggedSceneId(null);
          setDraggedOriginalIndex(null);
          setDragOverIndex(null);
          setHoverAdjacentIndices([null, null]);
          setIsDragging(false);
        }
        return;
      }

      const sortedScenesForComparison = [...scenes].sort(
        (a, b) => a.start - b.start
      );
      const draggedIndex = sortedScenesForComparison.findIndex(
        s => s.id === draggedSceneId
      );
      const targetIndex = dragOverIndex !== null ? dragOverIndex : index;

      if (dragOverIndex === null && draggedOriginalIndex !== null) {
        setShowSetbackAnimation(true);
        setTimeout(() => {
          setShowSetbackAnimation(false);
          setDraggedSceneId(null);
          setDraggedOriginalIndex(null);
          setDragOverIndex(null);
          setHoverAdjacentIndices([null, null]);
          setIsDragging(false);
        }, 300);
      } else if (
        draggedIndex !== targetIndex &&
        draggedIndex !== -1 &&
        targetIndex !== draggedOriginalIndex
      ) {
        onSceneReorder(draggedIndex, targetIndex);
        setDraggedSceneId(null);
        setDraggedOriginalIndex(null);
        setDragOverIndex(null);
        setHoverAdjacentIndices([null, null]);
        setIsDragging(false);
      } else {
        setShowSetbackAnimation(true);
        setTimeout(() => {
          setShowSetbackAnimation(false);
          setDraggedSceneId(null);
          setDraggedOriginalIndex(null);
          setDragOverIndex(null);
          setHoverAdjacentIndices([null, null]);
          setIsDragging(false);
        }, 300);
      }
    },
    [
      draggedSceneId,
      dragOverIndex,
      draggedOriginalIndex,
      scenes,
      onSceneReorder,
    ]
  );

  const handleDragEnd = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      cancelAnimationFrame(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (draggedOriginalIndex !== null && dragOverIndex === null) {
      setShowSetbackAnimation(true);
      setTimeout(() => {
        setShowSetbackAnimation(false);
        setDraggedSceneId(null);
        setDraggedOriginalIndex(null);
        setDragOverIndex(null);
        setHoverAdjacentIndices([null, null]);
        setIsDragging(false);
        setClosestBoundary(null);
      }, 300);
    } else {
      setDraggedSceneId(null);
      setDraggedOriginalIndex(null);
      setDragOverIndex(null);
      setHoverAdjacentIndices([null, null]);
      setIsDragging(false);
      setClosestBoundary(null);
    }
    dragOffset.current = 0;
  }, [draggedOriginalIndex, dragOverIndex]);

  const handleTransitionSelect = useCallback(
    (
      transition: TransitionType,
      sceneId: string,
      position: 'start' | 'end'
    ) => {
      console.log('[StoryboardTimeline] handleTransitionSelect called:', {
        transition,
        sceneId,
        position,
        hasOnTransitionSet: !!onTransitionSet,
        totalScenes: scenes.length,
      });

      if (!onTransitionSet) {
        console.error('[StoryboardTimeline] onTransitionSet is not defined!');
        return;
      }

      const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);
      const currentIndex = sortedScenes.findIndex(s => s.id === sceneId);
      const currentScene = sortedScenes[currentIndex];

      console.log('[StoryboardTimeline] Scene info:', {
        currentIndex,
        currentSceneId: currentScene?.id,
        isFirstScene: currentIndex === 0,
        isLastScene: currentIndex === sortedScenes.length - 1,
      });

      if (transition === 'crossfade') {
        console.log('[StoryboardTimeline] Handling crossfade transition');
        if (position === 'start' && currentIndex > 0) {
          const prevScene = sortedScenes[currentIndex - 1];
          console.log(
            '[StoryboardTimeline] Setting crossfade on prev scene end and current start:',
            {
              prevSceneId: prevScene.id,
              currentSceneId: sceneId,
            }
          );
          onTransitionSet(prevScene.id, transition, 'end');
          onTransitionSet(sceneId, transition, 'start');
        } else if (
          position === 'end' &&
          currentIndex < sortedScenes.length - 1
        ) {
          const nextScene = sortedScenes[currentIndex + 1];
          console.log(
            '[StoryboardTimeline] Setting crossfade on current end and next start:',
            {
              currentSceneId: sceneId,
              nextSceneId: nextScene.id,
            }
          );
          onTransitionSet(sceneId, transition, 'end');
          onTransitionSet(nextScene.id, transition, 'start');
        } else {
          console.warn(
            '[StoryboardTimeline] Cannot set crossfade - no adjacent scene:',
            { position, currentIndex }
          );
        }
      } else if (transition === 'continuous-shot') {
        console.log('[StoryboardTimeline] Handling continuous-shot transition');
        if (position === 'start' && currentIndex > 0) {
          const prevScene = sortedScenes[currentIndex - 1];
          console.log(
            '[StoryboardTimeline] Setting continuous-shot on prev scene end and current start:',
            {
              prevSceneId: prevScene.id,
              currentSceneId: sceneId,
            }
          );
          onTransitionSet(prevScene.id, transition, 'end');
          onTransitionSet(sceneId, transition, 'start');
        } else if (
          position === 'end' &&
          currentIndex < sortedScenes.length - 1
        ) {
          const nextScene = sortedScenes[currentIndex + 1];
          console.log(
            '[StoryboardTimeline] Setting continuous-shot on current end and next start:',
            {
              currentSceneId: sceneId,
              nextSceneId: nextScene.id,
            }
          );
          onTransitionSet(sceneId, transition, 'end');
          onTransitionSet(nextScene.id, transition, 'start');
        } else {
          console.warn(
            '[StoryboardTimeline] Cannot set continuous-shot - no adjacent scene:',
            { position, currentIndex }
          );
        }
      } else {
        if (position === 'start') {
          if (currentScene.transitionIn === 'crossfade' && currentIndex > 0) {
            const prevScene = sortedScenes[currentIndex - 1];
            if (prevScene.transitionOut === 'crossfade' && onTransitionRemove) {
              onTransitionRemove(prevScene.id, 'end');
            }
          }
          if (transition === 'fade-in') {
            onTransitionSet(sceneId, transition, 'start');
          } else if (transition === 'fade-to-black') {
            onTransitionSet(sceneId, 'fade-in', 'start');
            if (currentIndex > 0) {
              const prevScene = sortedScenes[currentIndex - 1];
              onTransitionSet(prevScene.id, 'fade-out', 'end');
            }
          }
        } else if (position === 'end') {
          if (
            currentScene.transitionOut === 'crossfade' &&
            currentIndex < sortedScenes.length - 1
          ) {
            const nextScene = sortedScenes[currentIndex + 1];
            if (nextScene.transitionIn === 'crossfade' && onTransitionRemove) {
              onTransitionRemove(nextScene.id, 'start');
            }
          }
          if (transition === 'fade-out') {
            onTransitionSet(sceneId, transition, 'end');
          } else if (transition === 'fade-to-black') {
            onTransitionSet(sceneId, 'fade-out', 'end');
            if (currentIndex < sortedScenes.length - 1) {
              const nextScene = sortedScenes[currentIndex + 1];
              onTransitionSet(nextScene.id, 'fade-in', 'start');
            }
          }
        }
      }
    },
    [onTransitionSet, onTransitionRemove, scenes]
  );

  const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);

  useEffect(() => {
    const syncRulerScroll = () => {
      if (timeRulerRef.current) {
        const scrollLeft = timeRulerRef.current.scrollLeft;
        setRulerScrollLeft(scrollLeft);
      }
    };

    const timeRuler = timeRulerRef.current;
    if (timeRuler) {
      syncRulerScroll();
      timeRuler.addEventListener('scroll', syncRulerScroll);
    }

    return () => {
      if (timeRuler) {
        timeRuler.removeEventListener('scroll', syncRulerScroll);
      }
    };
  }, [timelineWidth]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const timeRuler = timeRulerRef.current;
    if (!scrollContainer || !timeRuler) return;

    const handleWheel = (e: WheelEvent) => {
      const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);

      if (isHorizontalScroll || isVerticalScroll) {
        e.preventDefault();
        e.stopPropagation();

        const scrollAmount = isHorizontalScroll ? e.deltaX : e.deltaY;
        const currentScrollLeft = timeRuler.scrollLeft;
        const targetScrollLeft = currentScrollLeft + scrollAmount;

        const maxScrollLeft = timeRuler.scrollWidth - timeRuler.clientWidth;
        const clampedScrollLeft = Math.max(
          0,
          Math.min(targetScrollLeft, maxScrollLeft)
        );

        timeRuler.scrollTo({
          left: clampedScrollLeft,
          behavior: 'auto',
        });
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    timeRuler.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      timeRuler.removeEventListener('wheel', handleWheel);
    };
  }, [timelineWidth]);

  return (
    <div className="w-full bg-zinc-950/80 backdrop-blur-sm border-t border-white/5 flex-shrink-0 z-30">
      <div className="container mx-auto px-6 py-4">
        <div className="relative" ref={timelineRef}>
          <div
            ref={scrollContainerRef}
            className="overflow-x-hidden overflow-y-auto scrollbar-modern rounded-lg relative"
            style={{ height: '140px', maxHeight: '140px' }}
            onDragOver={handleDragOver}
            onDrop={e => {
              if (dragOverIndex !== null) {
                handleDrop(e, dragOverIndex);
              }
            }}
          >
            {/* Fixed label sections outside transformed content */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-20 pointer-events-none">
              <div className="sticky top-0 w-full h-full flex flex-col">
                <div
                  className="w-full bg-zinc-900 border-r border-zinc-800/50 flex flex-col items-center justify-center rounded-l-lg"
                  style={{ height: '88px' }}
                >
                  {onAddScene && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onAddScene();
                      }}
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-all duration-200 hover:bg-zinc-800/50 pointer-events-auto"
                      title="Add new scene"
                    >
                      <Plus className="w-5 h-5" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <div
                  className="w-full bg-zinc-900 border-r border-zinc-800/50 flex flex-col items-center justify-center rounded-l-lg"
                  style={{ height: '40px' }}
                >
                  <ArrowRightLeft
                    className="w-4 h-4 text-zinc-500"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                width: `${timelineWidth}px`,
                transform: `translateX(-${rulerScrollLeft}px)`,
              }}
            >
              {/* Video Track */}
              <div className="relative">
                <VideoTrack
                  scenes={scenes}
                  extendedDuration={extendedDuration}
                  timelineWidth={timelineWidth}
                  focusedSceneId={focusedSceneId}
                  draggedSceneId={draggedSceneId}
                  dragOverIndex={dragOverIndex}
                  hoverAdjacentIndices={hoverAdjacentIndices}
                  closestBoundary={closestBoundary}
                  showSetbackAnimation={showSetbackAnimation}
                  isDragging={isDragging}
                  onSceneClick={onSceneClick}
                  onSceneDragStart={handleDragStart}
                  onSceneDragEnd={handleDragEnd}
                  onSceneResize={onSceneResize}
                  onAddScene={onAddScene}
                  onSceneMediaDrop={onSceneMediaDrop}
                  onStepClick={onStepClick}
                  generationStep={
                    generationStep === 'environment_image_generation'
                      ? 'environment_generation'
                      : generationStep
                  }
                />
              </div>

              {/* Transitions Track */}
              <TransitionsTrack
                scenes={scenes}
                extendedDuration={extendedDuration}
                timelineWidth={timelineWidth}
                onTransitionSelect={handleTransitionSelect}
                onTransitionRemove={onTransitionRemove}
                transitionColors={TRANSITION_COLORS}
              />
            </div>
          </div>

          {/* Time ruler - fixed at bottom, always visible, syncs horizontal scroll */}
          <div
            ref={timeRulerRef}
            className="relative mt-3 cursor-pointer overflow-x-auto overflow-y-hidden scrollbar-modern"
            style={{ width: '100%', minHeight: '32px', paddingBottom: '4px' }}
            onMouseDown={handleTimelineMouseDown}
            onClick={handlePlayBarClick}
          >
            <div className="w-full h-full">
              <div
                style={{
                  width: `${80 + timelineWidth}px`,
                  position: 'relative',
                  minHeight: '28px',
                }}
              >
                {/* Play cursor arrow pointing up (at top) */}
                <div
                  className="absolute top-0 cursor-grab active:cursor-grabbing transition-opacity hover:opacity-80 z-50 pointer-events-auto"
                  style={{
                    left: `${80 + (currentTime / extendedDuration) * timelineWidth}px`,
                    transform: 'translateX(-50%)',
                    transition:
                      isDraggingTime || isDraggingTimeline || isPlaying
                        ? 'none'
                        : 'left 0.2s ease-out',
                  }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    handlePlayBarDragStart(e);
                  }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500" />
                </div>

                {(() => {
                  const markers = [];
                  const interval =
                    visibleDuration > 60 ? 10 : visibleDuration > 30 ? 5 : 1;
                  for (let i = 0; i <= extendedDuration; i += interval) {
                    markers.push(i);
                  }
                  return markers.map(time => (
                    <div
                      key={time}
                      className="absolute flex flex-col pointer-events-none"
                      style={{
                        left:
                          time === 0
                            ? '80px'
                            : `${80 + (time / extendedDuration) * timelineWidth}px`,
                        transform:
                          time === 0 ? 'translateX(0)' : 'translateX(-50%)',
                        top: 0,
                      }}
                    >
                      <div
                        className="w-px h-3 bg-zinc-700/50"
                        style={{
                          marginLeft: time === 0 ? '0' : 'auto',
                          marginRight: time === 0 ? 'auto' : 'auto',
                        }}
                      />
                      <span
                        className="text-[10px] text-zinc-500 mt-1 font-mono whitespace-nowrap"
                        style={{
                          marginLeft: time === 0 ? '0' : 'auto',
                          marginRight: time === 0 ? 'auto' : 'auto',
                          textAlign: time === 0 ? 'left' : 'center',
                        }}
                      >
                        {formatTimecode(time)}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
