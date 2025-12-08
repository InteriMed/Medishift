"use client";

import { useState } from "react";
import { StoryboardScene, TransitionType } from "@/types/storyboard";
import { cn } from "@/lib/utils";
import { Plus, Edit2, ArrowRightLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TransitionsTrackProps {
  scenes: StoryboardScene[];
  extendedDuration: number;
  timelineWidth: number;
  onTransitionSelect: (transition: TransitionType, sceneId: string, position: 'start' | 'end') => void;
  onTransitionRemove?: (sceneId: string, position: 'start' | 'end') => void;
  transitionColors: Record<TransitionType, string>;
}

const TRANSITION_COLORS: Record<TransitionType, string> = {
  'fade-in': 'bg-blue-500',
  'fade-out': 'bg-purple-500',
  'crossfade': 'bg-green-500',
  'fade-to-black': 'bg-zinc-700',
  'continuous-shot': 'bg-cyan-500',
  'none': 'bg-transparent'
};

export function TransitionsTrack({
  scenes,
  extendedDuration,
  timelineWidth,
  onTransitionSelect,
  onTransitionRemove,
  transitionColors = TRANSITION_COLORS
}: TransitionsTrackProps) {
  const [openTransitionMenuSceneId, setOpenTransitionMenuSceneId] = useState<string | null>(null);
  const [openTransitionMenuPosition, setOpenTransitionMenuPosition] = useState<'start' | 'end' | null>(null);

  const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);

  const getTransitionLabel = (transition: TransitionType | undefined): string => {
    if (!transition || transition === 'none') return '';
    if (transition === 'fade-in') return 'FI';
    if (transition === 'fade-out') return 'FO';
    if (transition === 'fade-to-black') return 'FTB';
    if (transition === 'crossfade') return 'XF';
    if (transition === 'continuous-shot') return 'CS';
    return '';
  };

  const handleCrossTransitionSelect = (
    transition: 'crossfade' | 'continuous-shot',
    sceneId: string,
    position: 'start' | 'end'
  ) => {
    console.log('[TransitionsTrack] handleCrossTransitionSelect called:', {
      transition,
      sceneId,
      position,
      onTransitionSelect: typeof onTransitionSelect
    });
    onTransitionSelect(transition, sceneId, position);
    setOpenTransitionMenuSceneId(null);
    setOpenTransitionMenuPosition(null);
  };

  const handleCrossTransitionRemove = (
    sceneId: string,
    position: 'start' | 'end',
    index: number
  ) => {
    console.log('[TransitionsTrack] handleCrossTransitionRemove called:', {
      sceneId,
      position,
      index,
      hasOnTransitionRemove: !!onTransitionRemove,
      totalScenes: sortedScenes.length
    });
    if (onTransitionRemove) {
      if (position === 'end' && index < sortedScenes.length - 1) {
        const nextScene = sortedScenes[index + 1];
        console.log('[TransitionsTrack] Removing cross-transition from end:', { sceneId, nextSceneId: nextScene.id });
        onTransitionRemove(sceneId, 'end');
        onTransitionRemove(nextScene.id, 'start');
      } else if (position === 'start' && index > 0) {
        const prevScene = sortedScenes[index - 1];
        console.log('[TransitionsTrack] Removing cross-transition from start:', { prevSceneId: prevScene.id, sceneId });
        onTransitionRemove(prevScene.id, 'end');
        onTransitionRemove(sceneId, 'start');
      } else {
        console.log('[TransitionsTrack] Removing single transition:', { sceneId, position });
        onTransitionRemove(sceneId, position);
      }
    }
    setOpenTransitionMenuSceneId(null);
    setOpenTransitionMenuPosition(null);
  };

  return (
    <div 
      className="relative bg-zinc-900 rounded-lg border border-zinc-800/50 flex flex-col"
      style={{ width: `${timelineWidth}px`, height: '40px' }}
    >
      <div className="ml-20 relative flex items-center" style={{ height: '40px' }}>
        {sortedScenes.map((scene, index) => {
          const sceneDuration = scene.end - scene.start;
          const sceneLeft = (scene.start / extendedDuration) * timelineWidth;
          const sceneWidth = (sceneDuration / extendedDuration) * timelineWidth;
          const isLastScene = index === sortedScenes.length - 1;
          const nextScene = !isLastScene ? sortedScenes[index + 1] : null;
          const prevScene = index > 0 ? sortedScenes[index - 1] : null;
          
          if (index === 0 || index === 1) {
            console.log(`[TransitionsTrack] Rendering scene ${index} (${scene.id}):`, {
              transitionIn: scene.transitionIn,
              transitionOut: scene.transitionOut,
              prevSceneTransitionOut: prevScene?.transitionOut,
              nextSceneTransitionIn: nextScene?.transitionIn
            });
          }
          
          const isCrossTransition = (transition: TransitionType | undefined): boolean => {
            return transition === 'crossfade' || transition === 'continuous-shot';
          };
          
          const calculatedWidth = ((sceneWidth - 4) / 2) * 0.7;
          const blockWidth = sceneWidth < 40 ? Math.max(8, calculatedWidth) : Math.max(20, calculatedWidth);
          
          if (index === 0 || index === 1) {
            console.log(`[TransitionsTrack] Start block for scene ${index}:`, {
              hasTransition: !!scene.transitionIn,
              transition: scene.transitionIn,
              className: scene.transitionIn && scene.transitionIn !== 'none' ? transitionColors[scene.transitionIn] : 'empty'
            });
          }
          
          return (
            <div 
              key={`transition-${scene.id}`} 
              className="absolute top-0 bottom-0 flex gap-1"
              style={{ 
                left: `${sceneLeft}px`, 
                width: `${sceneWidth}px`
              }}
            >
              <div
                className={cn(
                  "flex-1 flex items-center justify-center rounded border-2 transition-all duration-200 group relative cursor-pointer",
                  scene.transitionIn && scene.transitionIn !== 'none'
                    ? cn(transitionColors[scene.transitionIn], "border-white/30")
                    : "bg-zinc-800/40 border-zinc-700/50 border-dashed hover:border-zinc-600"
                )}
                style={{ minWidth: `${blockWidth}px`, paddingTop: '8px', paddingBottom: '8px' }}
              >
                {scene.transitionIn && scene.transitionIn !== 'none' ? (
                  <Popover 
                    open={openTransitionMenuSceneId === scene.id && openTransitionMenuPosition === 'start'}
                    onOpenChange={(open) => {
                      if (open) {
                        setOpenTransitionMenuSceneId(scene.id);
                        setOpenTransitionMenuPosition('start');
                      } else {
                        setOpenTransitionMenuSceneId(null);
                        setOpenTransitionMenuPosition(null);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTransitionMenuSceneId(scene.id);
                          setOpenTransitionMenuPosition('start');
                        }}
                        className="w-full h-full flex items-center justify-center relative group/transition"
                        title="Replace transition"
                      >
                        <span className="text-[10px] font-bold text-white">
                          {getTransitionLabel(scene.transitionIn)}
                        </span>
                      </div>
                    </PopoverTrigger>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded pointer-events-none">
                      <Edit2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <PopoverContent className="w-48 p-2 bg-zinc-800 border-zinc-700" align="start">
                      <div className="flex flex-col gap-2">
                        {prevScene && (
                          <>
                            <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Cross Transitions</div>
                            <button
                              onClick={() => handleCrossTransitionSelect('crossfade', scene.id, 'start')}
                              className={cn(
                                "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                                isCrossTransition(scene.transitionIn) && scene.transitionIn === 'crossfade' && "hidden"
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['crossfade'])} />
                              <span>Crossfade</span>
                            </button>
                            
                            <button
                              onClick={() => handleCrossTransitionSelect('continuous-shot', scene.id, 'start')}
                              className={cn(
                                "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                                isCrossTransition(scene.transitionIn) && scene.transitionIn === 'continuous-shot' && "hidden"
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['continuous-shot'])} />
                              <span>Continuous Shot</span>
                            </button>
                            
                            <div className="border-t border-zinc-700 my-1" />
                          </>
                        )}
                        
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Start Transitions</div>
                        <button
                          onClick={() => {
                            if (isCrossTransition(scene.transitionIn)) {
                              handleCrossTransitionRemove(scene.id, 'start', index);
                            } else {
                              onTransitionSelect('fade-in', scene.id, 'start');
                            }
                            setOpenTransitionMenuSceneId(null);
                            setOpenTransitionMenuPosition(null);
                          }}
                          className={cn(
                            "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                            scene.transitionIn === 'fade-in' && "hidden"
                          )}
                        >
                          <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['fade-in'])} />
                          <span>Fade In</span>
                        </button>
                        
                        <div className="border-t border-zinc-700 my-1" />
                        
                        <button
                          onClick={() => {
                            if (isCrossTransition(scene.transitionIn)) {
                              handleCrossTransitionRemove(scene.id, 'start', index);
                            } else if (onTransitionRemove) {
                              onTransitionRemove(scene.id, 'start');
                            }
                            setOpenTransitionMenuSceneId(null);
                            setOpenTransitionMenuPosition(null);
                          }}
                          className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                        >
                          <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['none'])} />
                          <span>None</span>
                        </button>
                      </div>
                    </PopoverContent>
                    </Popover>
                  ) : (
                    <Popover 
                      open={openTransitionMenuSceneId === scene.id && openTransitionMenuPosition === 'start'}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenTransitionMenuSceneId(scene.id);
                          setOpenTransitionMenuPosition('start');
                        } else {
                          setOpenTransitionMenuSceneId(null);
                          setOpenTransitionMenuPosition(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTransitionMenuSceneId(scene.id);
                            setOpenTransitionMenuPosition('start');
                          }}
                          className="w-full h-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Add start transition"
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2 bg-zinc-800 border-zinc-700" align="start">
                        <div className="flex flex-col gap-2">
                          {prevScene && (
                            <>
                              <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Cross Transitions</div>
                              <button
                                onClick={() => handleCrossTransitionSelect('crossfade', scene.id, 'start')}
                                className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['crossfade'])} />
                                <span>Crossfade</span>
                              </button>
                              
                              <button
                                onClick={() => handleCrossTransitionSelect('continuous-shot', scene.id, 'start')}
                                className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['continuous-shot'])} />
                                <span>Continuous Shot</span>
                              </button>
                              
                              <div className="border-t border-zinc-700 my-1" />
                            </>
                          )}
                          
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Start Transitions</div>
                          <button
                            onClick={() => {
                              onTransitionSelect('fade-in', scene.id, 'start');
                              setOpenTransitionMenuSceneId(null);
                              setOpenTransitionMenuPosition(null);
                            }}
                            className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                          >
                            <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['fade-in'])} />
                            <span>Fade In</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              
              {!isLastScene && (
                <>
                  {index === 0 || index === 1 ? (() => {
                    console.log(`[TransitionsTrack] End block for scene ${index}:`, {
                      hasTransition: !!scene.transitionOut,
                      transition: scene.transitionOut,
                      className: scene.transitionOut && scene.transitionOut !== 'none' ? transitionColors[scene.transitionOut] : 'empty'
                    });
                    return null;
                  })() : null}
                  <div
                    className={cn(
                      "flex-1 flex items-center justify-center rounded border-2 transition-all duration-200 group relative cursor-pointer",
                      scene.transitionOut && scene.transitionOut !== 'none'
                        ? cn(transitionColors[scene.transitionOut], "border-white/30")
                        : "bg-zinc-800/40 border-zinc-700/50 border-dashed hover:border-zinc-600"
                    )}
                    style={{ minWidth: `${blockWidth}px`, paddingTop: '8px', paddingBottom: '8px' }}
                  >
                  {scene.transitionOut && scene.transitionOut !== 'none' ? (
                    <Popover 
                      open={openTransitionMenuSceneId === scene.id && openTransitionMenuPosition === 'end'}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenTransitionMenuSceneId(scene.id);
                          setOpenTransitionMenuPosition('end');
                        } else {
                          setOpenTransitionMenuSceneId(null);
                          setOpenTransitionMenuPosition(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTransitionMenuSceneId(scene.id);
                            setOpenTransitionMenuPosition('end');
                          }}
                          className="w-full h-full flex items-center justify-center relative group/transition"
                          title="Replace transition"
                        >
                          <span className="text-[10px] font-bold text-white">
                            {getTransitionLabel(scene.transitionOut)}
                          </span>
                        </div>
                      </PopoverTrigger>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded pointer-events-none">
                        <Edit2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      <PopoverContent className="w-48 p-2 bg-zinc-800 border-zinc-700" align="end">
                        <div className="flex flex-col gap-2">
                          {nextScene && (
                            <>
                              <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Cross Transitions</div>
                              <button
                                onClick={() => handleCrossTransitionSelect('crossfade', scene.id, 'end')}
                                className={cn(
                                  "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                                  isCrossTransition(scene.transitionOut) && scene.transitionOut === 'crossfade' && "hidden"
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['crossfade'])} />
                                <span>Crossfade</span>
                              </button>
                              
                              <button
                                onClick={() => handleCrossTransitionSelect('continuous-shot', scene.id, 'end')}
                                className={cn(
                                  "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                                  isCrossTransition(scene.transitionOut) && scene.transitionOut === 'continuous-shot' && "hidden"
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['continuous-shot'])} />
                                <span>Continuous Shot</span>
                              </button>
                              
                              <div className="border-t border-zinc-700 my-1" />
                            </>
                          )}
                          
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">End Transitions</div>
                          <button
                            onClick={() => {
                              if (isCrossTransition(scene.transitionOut)) {
                                handleCrossTransitionRemove(scene.id, 'end', index);
                              } else {
                                onTransitionSelect('fade-out', scene.id, 'end');
                              }
                              setOpenTransitionMenuSceneId(null);
                              setOpenTransitionMenuPosition(null);
                            }}
                            className={cn(
                              "text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2",
                              scene.transitionOut === 'fade-out' && "hidden"
                            )}
                          >
                            <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['fade-out'])} />
                            <span>Fade Out</span>
                          </button>
                          
                          <div className="border-t border-zinc-700 my-1" />
                          
                          <button
                            onClick={() => {
                              if (isCrossTransition(scene.transitionOut)) {
                                handleCrossTransitionRemove(scene.id, 'end', index);
                              } else if (onTransitionRemove) {
                                onTransitionRemove(scene.id, 'end');
                              }
                              setOpenTransitionMenuSceneId(null);
                              setOpenTransitionMenuPosition(null);
                            }}
                            className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                          >
                            <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['none'])} />
                            <span>None</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Popover 
                      open={openTransitionMenuSceneId === scene.id && openTransitionMenuPosition === 'end'}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenTransitionMenuSceneId(scene.id);
                          setOpenTransitionMenuPosition('end');
                        } else {
                          setOpenTransitionMenuSceneId(null);
                          setOpenTransitionMenuPosition(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTransitionMenuSceneId(scene.id);
                            setOpenTransitionMenuPosition('end');
                          }}
                          className="w-full h-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Add end transition"
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2 bg-zinc-800 border-zinc-700" align="end">
                        <div className="flex flex-col gap-2">
                          {nextScene && (
                            <>
                              <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">Cross Transitions</div>
                              <button
                                onClick={() => handleCrossTransitionSelect('crossfade', scene.id, 'end')}
                                className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['crossfade'])} />
                                <span>Crossfade</span>
                              </button>
                              
                              <button
                                onClick={() => handleCrossTransitionSelect('continuous-shot', scene.id, 'end')}
                                className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                              >
                                <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['continuous-shot'])} />
                                <span>Continuous Shot</span>
                              </button>
                              
                              <div className="border-t border-zinc-700 my-1" />
                            </>
                          )}
                          
                          <div className="text-[10px] font-semibold text-zinc-400 uppercase px-2">End Transitions</div>
                          <button
                            onClick={() => {
                              onTransitionSelect('fade-out', scene.id, 'end');
                              setOpenTransitionMenuSceneId(null);
                              setOpenTransitionMenuPosition(null);
                            }}
                            className="text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                          >
                            <span className={cn("w-2 h-2 rounded-full border border-white/30", transitionColors['fade-out'])} />
                            <span>Fade Out</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
