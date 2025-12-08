'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { SceneCard } from './SceneCard';
import { EnvironmentCard } from './EnvironmentCard';
import {
  StoryboardScene,
  TransitionType,
  GenerationStep,
  Environment,
} from '@/types/storyboard';
import { cn } from '@/lib/utils';

interface StoryboardAreaProps {
  scenes: StoryboardScene[];
  environments?: Environment[];
  focusedSceneId?: string | null;
  focusedEnvironmentId?: number | null;
  onEditPrompt: (sceneId: string) => void;
  onRegenerate?: (sceneId: string) => void;
  onSave?: (sceneId: string, prompt: string) => void;
  onEnhancePrompt?: (sceneId: string, prompt: string) => Promise<string>;
  onDelete?: (sceneId: string) => void;
  onTransitionSet?: (
    fromSceneId: string,
    toSceneId: string,
    transition: TransitionType
  ) => void;
  onSceneClick?: (sceneId: string) => void;
  onEnvironmentClick?: (environmentId: number) => void;
  onRecreate?: (sceneId: string, type: 'image' | 'video') => void;
  onMediaClick?: (sceneId: string) => void;
  onEnvironmentMediaClick?: (environmentId: number) => void;
  selectedTransition?: TransitionType;
  isRegenerating?: (sceneId: string) => boolean;
  generationStep?: GenerationStep;
  cardHeight?: number;
}

export function StoryboardArea({
  scenes,
  environments,
  focusedSceneId,
  focusedEnvironmentId,
  onEditPrompt,
  onRegenerate,
  onSave,
  onEnhancePrompt,
  onDelete,
  onTransitionSet,
  onSceneClick,
  onEnvironmentClick,
  onRecreate,
  onMediaClick,
  onEnvironmentMediaClick,
  selectedTransition,
  isRegenerating,
  generationStep,
  cardHeight = 400,
}: StoryboardAreaProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const environmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  // Extract unique environments from scenes if not provided
  const uniqueEnvironments = useMemo(() => {
    if (environments) return environments;

    const envMap = new Map<number, Environment>();
    scenes.forEach(scene => {
      if (scene.environment !== undefined) {
        if (!envMap.has(scene.environment)) {
          envMap.set(scene.environment, {
            id: scene.environment,
            prompt: scene.prompt,
            imageUrl: scene.thumbnailUrl,
          });
        }
      }
    });
    return Array.from(envMap.values()).sort((a, b) => a.id - b.id);
  }, [scenes, environments]);

  const isEnvironmentStep =
    generationStep === 'environment_generation' ||
    generationStep === 'environment_image_generation';
  const displayItems = isEnvironmentStep ? uniqueEnvironments : scenes;

  const centerCard = (sceneId: string) => {
    if (
      !cardRefs.current.has(sceneId) ||
      !scrollAreaRef.current ||
      !containerRef.current
    )
      return;

    const wrapperElement = cardRefs.current.get(sceneId);
    if (!wrapperElement) return;

    const actualCardElement = wrapperElement.querySelector(
      '[draggable="true"]'
    ) as HTMLElement;
    const cardElement = actualCardElement || wrapperElement;

    const scrollArea = scrollAreaRef.current;
    const viewport = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement;
    if (!viewport) return;

    const cardRect = cardElement.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    const cardCenterX = cardRect.left + cardRect.width / 2;
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;

    const scrollOffset = cardCenterX - viewportCenterX;

    const currentScrollLeft = viewport.scrollLeft;
    const targetScrollLeft = currentScrollLeft + scrollOffset;

    const maxScrollLeft = Math.max(
      0,
      viewport.scrollWidth - viewport.clientWidth
    );
    const clampedScrollLeft = Math.max(
      0,
      Math.min(targetScrollLeft, maxScrollLeft)
    );

    viewport.scrollTo({
      left: clampedScrollLeft,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!focusedSceneId) return;

    const centerViewportScene = () => {
      const scene = scenes.find(s => s.id === focusedSceneId);
      if (!scene || !cardRefs.current.has(focusedSceneId)) {
        return;
      }
      centerCard(focusedSceneId);
    };

    requestAnimationFrame(() => {
      setTimeout(centerViewportScene, 0);
    });
  }, [focusedSceneId, scenes]);

  useEffect(() => {
    if (scenes.length > 0 && !focusedSceneId) {
      onSceneClick?.(scenes[0].id);
    }
  }, [scenes, scenes.length, focusedSceneId, onSceneClick]);

  const getCurrentFocusedIndex = useCallback(() => {
    if (!focusedSceneId) return -1;
    return scenes.findIndex(s => s.id === focusedSceneId);
  }, [scenes, focusedSceneId]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        e.stopPropagation();

        const currentIndex = getCurrentFocusedIndex();
        if (e.deltaY > 0) {
          if (currentIndex >= 0 && currentIndex < scenes.length - 1) {
            const nextScene = scenes[currentIndex + 1];
            onSceneClick?.(nextScene.id);
          }
        } else {
          if (currentIndex > 0) {
            const previousScene = scenes[currentIndex - 1];
            onSceneClick?.(previousScene.id);
          }
        }
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [scenes, focusedSceneId, onSceneClick, getCurrentFocusedIndex]);

  const scrollViewport = (direction: 'left' | 'right') => {
    if (!scrollAreaRef.current) return;

    const scrollArea = scrollAreaRef.current;
    const viewport = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement;
    if (!viewport) return;

    const scrollAmount = viewport.clientWidth * 0.8;
    const currentScrollLeft = viewport.scrollLeft;
    const targetScrollLeft =
      direction === 'left'
        ? currentScrollLeft - scrollAmount
        : currentScrollLeft + scrollAmount;

    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const clampedScrollLeft = Math.max(
      0,
      Math.min(targetScrollLeft, maxScrollLeft)
    );

    viewport.scrollTo({
      left: clampedScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col">
      <ScrollArea ref={scrollAreaRef} className="flex-1 w-full min-h-0">
        <div
          ref={containerRef}
          className="flex gap-6 py-8 px-[50vw] min-w-max items-stretch"
          style={{ minHeight: '100%' }}
        >
          {isEnvironmentStep
            ? uniqueEnvironments.map(environment => (
              <div
                key={environment.id}
                ref={el => {
                  if (el) {
                    environmentRefs.current.set(environment.id, el);
                  } else {
                    environmentRefs.current.delete(environment.id);
                  }
                }}
              >
                <EnvironmentCard
                  environment={environment}
                  isFocused={focusedEnvironmentId === environment.id}
                  generationStep={generationStep}
                  cardHeight={cardHeight}
                  onEnvironmentClick={onEnvironmentClick}
                  onMediaClick={onEnvironmentMediaClick}
                />
              </div>
            ))
            : scenes.map((scene, index) => {
              const nextScene =
                index < scenes.length - 1 ? scenes[index + 1] : undefined;
              return (
                <div
                  key={scene.id}
                  ref={el => {
                    if (el) {
                      cardRefs.current.set(scene.id, el);
                    } else {
                      cardRefs.current.delete(scene.id);
                    }
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverSceneId(scene.id);
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverSceneId(null);
                    }
                  }}
                >
                  <SceneCard
                    scene={scene}
                    isFocused={focusedSceneId === scene.id}
                    isDragOver={dragOverSceneId === scene.id}
                    onEditPrompt={onEditPrompt}
                    onRegenerate={onRegenerate}
                    onSave={onSave}
                    onEnhancePrompt={onEnhancePrompt}
                    onDelete={onDelete}
                    onTransitionSet={onTransitionSet}
                    onSceneClick={onSceneClick}
                    onRecreate={onRecreate}
                    onMediaClick={onMediaClick}
                    nextScene={nextScene}
                    selectedTransition={selectedTransition}
                    isRegenerating={isRegenerating?.(scene.id) || false}
                    generationStep={generationStep}
                    cardHeight={cardHeight}
                    totalScenes={scenes.length}
                  />
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
