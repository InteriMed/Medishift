'use client';

import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  ChevronsLeft,
  ChevronsRight,
  RotateCw,
  RotateCcw,
  HelpCircle,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { EnhancedSlider as Slider } from '@/components/ui/enhanced-slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

interface StoryboardControlsProps {
  onCreate?: () => void;
  selectedTransition?: string;
  onTransitionChange?: (transition: string) => void;
  showTransitionsOnCards?: boolean;
  onShowTransitionsToggle?: (show: boolean) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSkipForward?: () => void;
  onSkipBackward?: () => void;
  onSkipToStart?: () => void;
  onSkipToEnd?: () => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  showCompactMode?: boolean;
  compactModeContent?: React.ReactNode;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
  selectedVideoModel?: string;
  onVideoModelChange?: (model: string) => void;
  selectedUpscaleModel?: string;
  onUpscaleModelChange?: (model: string) => void;
}

const aspectRatioOptions = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
  { value: '2:3', label: '2:3' },
];

const resolutionOptions = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
  { value: '4K', label: '4K' },
];

const transitionOptions = [
  { value: 'none', label: 'None', color: 'transparent' },
  { value: 'fade-in', label: 'Fade In', color: 'bg-blue-500' },
  { value: 'fade-out', label: 'Fade Out', color: 'bg-purple-500' },
  { value: 'crossfade', label: 'Crossfade', color: 'bg-green-500' },
  { value: 'continuous-shot', label: 'Continuous Shot', color: 'bg-cyan-500' },
  { value: 'fade-to-black', label: 'Fade to Black', color: 'bg-zinc-700' },
];

const imageModels = [
  { value: 'clipizy_free', label: 'Clipizy Free', credits: '3+' },
  { value: 'qwen-image', label: 'Clipizy Pro', credits: '3+' },
];

const videoModels = [
  { value: 'clipizy_free', label: 'Clipizy Free', credits: '5+' },
  { value: 'seedance_light', label: 'Seedance Light', credits: '8+' },
  { value: 'seedance_pro', label: 'Seedance Pro', credits: '12+' },
  { value: 'sora2', label: 'Sora 2', credits: '15+' },
  { value: 'wan_2.2', label: 'WAN 2.2', credits: '10+' },
];

const upscaleModels = [
  { value: 'video-upscaler', label: 'Video Upscaler', credits: '15+' },
  { value: 'seedvr', label: 'SeedVR', credits: '18+' },
  { value: 'flashvsr', label: 'FlashVSR', credits: '20+' },
  { value: 'bytedance-upscaler', label: 'ByteDance Upscaler', credits: '15+' },
];

export function StoryboardControls({
  onCreate,
  selectedTransition = 'none',
  onTransitionChange,
  showTransitionsOnCards = true,
  onShowTransitionsToggle,
  isPlaying = false,
  onPlayPause,
  onSkipForward,
  onSkipBackward,
  onSkipToStart,
  onSkipToEnd,
  zoomLevel = 1,
  onZoomChange,
  minZoom = 0.1,
  maxZoom = 5,
  showCompactMode = false,
  compactModeContent,
  selectedImageModel = 'clipizy_free',
  onImageModelChange,
  selectedVideoModel = 'clipizy_free',
  onVideoModelChange,
  selectedUpscaleModel = 'video-upscaler',
  onUpscaleModelChange,
}: StoryboardControlsProps) {
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [resolution, setResolution] = useState('480p');
  const [transition, setTransition] = useState(selectedTransition);
  const [aspectRatioOpen, setAspectRatioOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showZoomButton, setShowZoomButton] = useState(false);
  const [showSettingsIcon, setShowSettingsIcon] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTransition(selectedTransition);
  }, [selectedTransition]);

  useEffect(() => {
    const checkWidth = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const minWidthForZoomBar = 800;
      const minWidthForSettings = 600;

      setShowZoomButton(containerWidth < minWidthForZoomBar);
      setShowSettingsIcon(containerWidth < minWidthForSettings);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    const resizeObserver = new ResizeObserver(checkWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', checkWidth);
      resizeObserver.disconnect();
    };
  }, []);

  const handleTransitionChange = (value: string) => {
    setTransition(value);
    onTransitionChange?.(value);
    setTransitionOpen(false);
    setSettingsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-16 flex-shrink-0 bg-card border-t border-border flex items-center justify-between px-6"
    >
      <div className="flex items-center gap-2">
        {showSettingsIcon ? (
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-2 bg-zinc-800 border-zinc-700"
              align="start"
            >
              <div className="flex flex-col gap-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Video Format
                </div>
                {aspectRatioOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setAspectRatio(option.value);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors',
                      aspectRatio === option.value && 'bg-white/20'
                    )}
                  >
                    {option.label}
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Quality
                </div>
                {resolutionOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setResolution(option.value);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors',
                      resolution === option.value && 'bg-white/20'
                    )}
                  >
                    {option.label}
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Transitions
                </div>
                {transitionOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleTransitionChange(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2',
                      transition === option.value && 'bg-white/20'
                    )}
                  >
                    {option.value !== 'none' && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full border border-white/30',
                          option.color
                        )}
                      />
                    )}
                    <span>{option.label}</span>
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Image Models
                </div>
                {imageModels.map(model => (
                  <button
                    key={model.value}
                    onClick={() => {
                      onImageModelChange?.(model.value);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                      selectedImageModel === model.value && 'bg-white/20'
                    )}
                  >
                    <span>{model.label}</span>
                    <span className="text-xs text-white/50">
                      {model.credits} credits
                    </span>
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Video Models
                </div>
                {videoModels.map(model => (
                  <button
                    key={model.value}
                    onClick={() => {
                      onVideoModelChange?.(model.value);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                      selectedVideoModel === model.value && 'bg-white/20'
                    )}
                  >
                    <span>{model.label}</span>
                    <span className="text-xs text-white/50">
                      {model.credits} credits
                    </span>
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Upscale Models
                </div>
                {upscaleModels.map(model => (
                  <button
                    key={model.value}
                    onClick={() => {
                      onUpscaleModelChange?.(model.value);
                      setSettingsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                      selectedUpscaleModel === model.value && 'bg-white/20'
                    )}
                  >
                    <span>{model.label}</span>
                    <span className="text-xs text-white/50">
                      {model.credits} credits
                    </span>
                  </button>
                ))}

                <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Help
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
                  title="Drag a transition option onto a clip to apply it to that clip's closest end. Or select a transition to apply it to all clips."
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>About Transitions</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <Popover open={aspectRatioOpen} onOpenChange={setAspectRatioOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
                >
                  {aspectRatio}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-32 p-1 bg-zinc-800 border-zinc-700"
                align="start"
              >
                <div className="flex flex-col">
                  {aspectRatioOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setAspectRatio(option.value);
                        setAspectRatioOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors',
                        aspectRatio === option.value && 'bg-white/20'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={resolutionOpen} onOpenChange={setResolutionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
                >
                  {resolution}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-32 p-1 bg-zinc-800 border-zinc-700"
                align="start"
              >
                <div className="flex flex-col">
                  {resolutionOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setResolution(option.value);
                        setResolutionOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors',
                        resolution === option.value && 'bg-white/20'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={transitionOpen} onOpenChange={setTransitionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
                >
                  Transitions
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-32 p-1 bg-zinc-800 border-zinc-700"
                align="start"
              >
                <div className="flex flex-col">
                  {transitionOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleTransitionChange(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2',
                        transition === option.value && 'bg-white/20'
                      )}
                    >
                      {option.value !== 'none' && (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full border border-white/30',
                            option.color
                          )}
                        />
                      )}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={modelsOpen} onOpenChange={setModelsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-medium bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
                >
                  Models
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-2 bg-zinc-800 border-zinc-700"
                align="start"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Image Models
                    </div>
                    {imageModels.map(model => (
                      <button
                        key={model.value}
                        onClick={() => {
                          onImageModelChange?.(model.value);
                          setModelsOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                          selectedImageModel === model.value && 'bg-white/20'
                        )}
                      >
                        <span>{model.label}</span>
                        <span className="text-xs text-white/50">
                          {model.credits} credits
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Video Models
                    </div>
                    {videoModels.map(model => (
                      <button
                        key={model.value}
                        onClick={() => {
                          onVideoModelChange?.(model.value);
                          setModelsOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                          selectedVideoModel === model.value && 'bg-white/20'
                        )}
                      >
                        <span>{model.label}</span>
                        <span className="text-xs text-white/50">
                          {model.credits} credits
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Upscale Models
                    </div>
                    {upscaleModels.map(model => (
                      <button
                        key={model.value}
                        onClick={() => {
                          onUpscaleModelChange?.(model.value);
                          setModelsOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded transition-colors flex items-center justify-between',
                          selectedUpscaleModel === model.value && 'bg-white/20'
                        )}
                      >
                        <span>{model.label}</span>
                        <span className="text-xs text-white/50">
                          {model.credits} credits
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              title="Drag a transition option onto a clip to apply it to that clip's closest end. Or select a transition to apply it to all clips."
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 flex-1 justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
          onClick={onSkipToStart}
          title="Skip to Start"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
          onClick={onSkipBackward}
          title="Skip Backward 10s"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs">10s</span>
        </Button>

        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
          onClick={onSkipForward}
          title="Skip Forward 10s"
        >
          <span className="text-xs">10s</span>
          <RotateCw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5"
          onClick={onSkipToEnd}
          title="Skip to End"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {showZoomButton ? (
          <Popover open={zoomOpen} onOpenChange={setZoomOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-medium bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
              >
                <ZoomIn className="h-4 w-4" />
                <span className="font-mono">
                  {zoomLevel === 0 ? 'Auto' : `${Math.round(zoomLevel * 100)}%`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-16 p-4 bg-zinc-800 border-zinc-700"
              align="start"
            >
              <div className="flex flex-col items-center gap-4 h-64">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() =>
                    onZoomChange?.(Math.min(maxZoom, zoomLevel * 1.5))
                  }
                  disabled={zoomLevel >= maxZoom}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative w-full flex items-center justify-center min-h-[200px]">
                  <Slider
                    value={[zoomLevel]}
                    onValueChange={value => onZoomChange?.(value[0])}
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    orientation="vertical"
                    className="h-full [&>div]:!bg-transparent [&>div>div]:bg-white/30 [&_[role=slider]]:!h-3 [&_[role=slider]]:!w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50 [&_[role=slider]]:shadow-lg"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() =>
                    onZoomChange?.(Math.max(minZoom, zoomLevel / 1.5))
                  }
                  disabled={zoomLevel <= minZoom}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="text-xs text-white/70 font-mono">
                  {zoomLevel === 0 ? 'Auto' : `${Math.round(zoomLevel * 100)}%`}
                </span>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2',
              showCompactMode ? 'w-64 sm:w-80' : 'w-96'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={() => onZoomChange?.(Math.max(minZoom, zoomLevel / 1.5))}
              disabled={zoomLevel <= minZoom}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <div className="flex-1 relative">
              <Slider
                value={[zoomLevel]}
                onValueChange={value => onZoomChange?.(value[0])}
                min={minZoom}
                max={maxZoom}
                step={0.1}
                className="[&>div]:!bg-transparent [&>div>div]:bg-white/30 [&_[role=slider]]:!h-3 [&_[role=slider]]:!w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50 [&_[role=slider]]:shadow-lg"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={() => onZoomChange?.(Math.min(maxZoom, zoomLevel * 1.5))}
              disabled={zoomLevel >= maxZoom}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <span className="text-xs text-white/70 font-mono w-12 text-right flex-shrink-0">
              {zoomLevel === 0 ? 'Auto' : `${Math.round(zoomLevel * 100)}%`}
            </span>
          </div>
        )}
        {showCompactMode && compactModeContent && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className={cn(
                  'h-8 btn-ai-gradient hover:opacity-90 text-white flex items-center gap-1.5 font-medium',
                  'px-2 sm:px-3 transition-all'
                )}
              >
                <span className="hidden sm:inline">Next Step</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[80vh] bg-zinc-900 border-zinc-800 overflow-y-auto"
            >
              <SheetTitle className="sr-only">Next Step</SheetTitle>
              {compactModeContent}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
