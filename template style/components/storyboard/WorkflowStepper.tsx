"use client";

import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GenerationStep } from "@/types/storyboard";

interface WorkflowStepperProps {
  currentStep: number;
  maxReachedStep: number;
  generationStep?: GenerationStep;
  onAdvanceStep?: (step: GenerationStep) => void;
  onStepClick?: (step: GenerationStep) => void;
  compactMode?: boolean;
}

const steps = [
  { id: 1, label: "Create environments", key: "environments", generationStep: "environment_generation" as GenerationStep },
  { id: 2, label: "Generate the images for the environments", key: "environment_images", generationStep: "environment_image_generation" as GenerationStep },
  { id: 3, label: "Define the scenes", key: "define", generationStep: "prompt_generation" as GenerationStep },
  { id: 4, label: "Generate scenes images", key: "generate", generationStep: "image_generation" as GenerationStep },
  { id: 5, label: "Generate scenes videos", key: "create", generationStep: "video_generation" as GenerationStep },
  { id: 6, label: "Upscale videos", key: "upscale", generationStep: "video_upscale" as GenerationStep },
  { id: 7, label: "Compose video", key: "compose", generationStep: "video_compose" as GenerationStep },
];

const getMaxReachedStepIndex = (generationStep?: GenerationStep): number => {
  if (!generationStep) return 0;
  const stepIndex = steps.findIndex(s => s.generationStep === generationStep);
  return stepIndex === -1 ? 0 : stepIndex;
};

const getStepGradientColor = (stepIndex: number, totalSteps: number): string => {
  const progress = stepIndex / (totalSteps - 1);
  
  if (progress <= 0.5) {
    const t = progress * 2;
    const r = Math.round(34 + (168 - 34) * t);
    const g = Math.round(211 + (85 - 211) * t);
    const b = Math.round(238 + (247 - 238) * t);
    return `rgb(${r} ${g} ${b})`;
  } else {
    const t = (progress - 0.5) * 2;
    const r = Math.round(168 + (236 - 168) * t);
    const g = Math.round(85 + (72 - 85) * t);
    const b = Math.round(247 + (153 - 247) * t);
    return `rgb(${r} ${g} ${b})`;
  }
};

export function WorkflowStepper({ currentStep, maxReachedStep, generationStep, onAdvanceStep, onStepClick, compactMode = false }: WorkflowStepperProps) {
  const getNextGenerationStep = (currentGenStep?: GenerationStep): GenerationStep | null => {
    if (!currentGenStep) return "environment_generation";
    if (currentGenStep === "environment_generation") return "environment_image_generation";
    if (currentGenStep === "environment_image_generation") return "prompt_generation";
    if (currentGenStep === "prompt_generation") return "image_generation";
    if (currentGenStep === "image_generation") return "video_generation";
    if (currentGenStep === "video_generation") return "video_upscale";
    if (currentGenStep === "video_upscale") return "video_compose";
    return null;
  };

  const shouldShowButton = (stepIndex: number) => {
    if (stepIndex === steps.length - 1) return false;
    
    return stepIndex === maxReachedStepIndex;
  };

  const handleAdvance = () => {
    if (!onAdvanceStep) return;
    const nextStep = getNextGenerationStep(generationStep);
    if (nextStep) {
      onAdvanceStep(nextStep);
    }
  };

  const maxReachedStepIndex = maxReachedStep - 1;

  const isStepReachable = (stepIndex: number): boolean => {
    return stepIndex <= maxReachedStepIndex;
  };

  const handleStepClick = (step: typeof steps[0]) => {
    if (!isStepReachable(steps.indexOf(step))) return;
    
    if (onStepClick) {
      onStepClick(step.generationStep);
    } else if (onAdvanceStep) {
      onAdvanceStep(step.generationStep);
    }
  };
  if (compactMode) {
    return (
      <div className="w-full py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4">
          {steps.map((step, index) => {
            const isMaxReached = index <= maxReachedStepIndex;
            const isCompleted = index < maxReachedStepIndex;
            const isCurrentViewing = step.id === currentStep;
            const isPending = index > maxReachedStepIndex;

            const isReachable = isStepReachable(index);
            const stepGradientColor = getStepGradientColor(index, steps.length);
            
            return (
              <div
                key={step.id}
                onClick={() => handleStepClick(step)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200",
                  isCompleted && "border-transparent bg-gradient-to-br from-zinc-800/50 to-zinc-900/50",
                  isCurrentViewing && !isCompleted && "border-cyan-400/50 bg-zinc-800/30",
                  !isCurrentViewing && !isCompleted && isMaxReached && "border-zinc-700 bg-zinc-800/20",
                  isPending && "border-zinc-800 bg-zinc-900/30 opacity-60",
                  isReachable && !isPending && "cursor-pointer hover:border-cyan-400/30 hover:bg-zinc-800/40",
                  !isReachable && "cursor-not-allowed"
                )}
              >
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 relative",
                      isCompleted && "p-[2px]"
                    )}
                    style={isCompleted ? {
                      background: `linear-gradient(135deg, ${stepGradientColor}, ${getStepGradientColor(Math.min(index + 1, steps.length - 1), steps.length)})`,
                      padding: '2px'
                    } : undefined}
                  >
                    {isCurrentViewing && (
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-white/60" 
                        style={{ 
                          animation: 'ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite',
                        }}
                      />
                    )}
                    {isCompleted ? (
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center relative z-10">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <Circle
                        className={cn(
                          "w-5 h-5 transition-all duration-200 relative z-10",
                          isMaxReached ? "text-cyan-400 fill-cyan-400/20" : "text-zinc-600"
                        )}
                        style={isMaxReached ? { color: stepGradientColor, fill: `${stepGradientColor}20` } : undefined}
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-zinc-400">Step {step.id}</span>
                    {shouldShowButton(index) && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvance();
                        }}
                        size="sm"
                        className="h-6 px-2 text-xs text-white flex-shrink-0 border-0 relative overflow-hidden btn-ai-gradient"
                      >
                        Generate
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors duration-200 block",
                      isCurrentViewing && "font-semibold text-white",
                      isPending && "text-zinc-500",
                      isMaxReached && !isPending && "text-zinc-300"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-shrink-0 bg-card border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-center gap-8">
          {steps.map((step, index) => {
            const isMaxReached = index <= maxReachedStepIndex;
            const isCompleted = index < maxReachedStepIndex;
            const isCurrentViewing = step.id === currentStep;
            const isPending = index > maxReachedStepIndex;

            const isReachable = isStepReachable(index);
            const stepGradientColor = getStepGradientColor(index, steps.length);
            
            return (
              <div key={step.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => handleStepClick(step)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 relative",
                      isCompleted && "p-[2px]",
                      !isCurrentViewing && !isCompleted && isMaxReached && "bg-zinc-800/50 border-zinc-700",
                      isPending && "bg-zinc-800 border-zinc-700",
                      isReachable && !isPending && "cursor-pointer hover:scale-110",
                      !isReachable && "cursor-not-allowed opacity-50"
                    )}
                    style={isCompleted ? {
                      background: `linear-gradient(135deg, ${stepGradientColor}, ${getStepGradientColor(Math.min(index + 1, steps.length - 1), steps.length)})`,
                      padding: '2px'
                    } : undefined}
                    title={isReachable ? `Go to ${step.label}` : "Step not yet reached"}
                  >
                    {isCurrentViewing && (
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-white/60" 
                        style={{ 
                          animation: 'ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite',
                        }}
                      />
                    )}
                    {isCompleted ? (
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center relative z-10">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <Circle
                        className={cn(
                          "w-5 h-5 transition-all duration-200 relative z-10",
                          isMaxReached ? "text-cyan-400 fill-cyan-400/20" : "text-zinc-600"
                        )}
                        style={isMaxReached ? { color: stepGradientColor, fill: `${stepGradientColor}20` } : undefined}
                      />
                    )}
                  </div>
                  <span
                    onClick={() => handleStepClick(step)}
                    className={cn(
                      "text-xs font-medium text-center max-w-[140px] transition-colors duration-200",
                      isCurrentViewing && "font-semibold",
                      isPending && "text-zinc-500",
                      isReachable && !isPending && "cursor-pointer",
                      !isReachable && "cursor-not-allowed"
                    )}
                    style={undefined}
                    title={isReachable ? `Go to ${step.label}` : "Step not yet reached"}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center gap-2">
                    {shouldShowButton(index) ? (
                      <>
                        <div
                          className="h-0.5 transition-all duration-200 relative overflow-hidden"
                          style={{ 
                            width: '32px',
                            background: 'rgb(39 39 42)'
                          }}
                        />
                        <Button
                          onClick={handleAdvance}
                          size="sm"
                          className="h-7 px-3 text-xs text-white flex-shrink-0 border-0 relative overflow-hidden btn-ai-gradient"
                          style={undefined}
                        >
                          Generate
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                        <div
                          className="h-0.5 transition-all duration-200 relative overflow-hidden"
                          style={{ 
                            width: '32px',
                            background: 'rgb(39 39 42)'
                          }}
                        />
                      </>
                    ) : (
                      <div
                        className="h-0.5 transition-all duration-200 relative overflow-hidden"
                        style={{ 
                          width: '64px',
                          background: 'rgb(39 39 42)'
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

