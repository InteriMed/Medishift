import { useState, useCallback } from "react";
import { FlowDefinition, FlowResult } from "./types";
import { z } from "zod";

export function useFlow<T>(flow: FlowDefinition<T>) {
  const [currentStepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  const getVisibleSteps = useCallback(() => {
    return flow.steps.filter(step => 
      !step.condition || step.condition(formData)
    );
  }, [flow.steps, formData]);

  const visibleSteps = getVisibleSteps();
  const currentStep = visibleSteps[currentStepIndex];

  const next = async (): Promise<FlowResult<T>> => {
    try {
      await currentStep.schema.parseAsync(formData);
      
      setErrors({});

      const nextIndex = currentStepIndex + 1;
      
      if (nextIndex < visibleSteps.length) {
        setIsTransitioning(true);
        setTimeout(() => {
          setStepIndex(nextIndex);
          setIsTransitioning(false);
        }, 300);
        return { complete: false };
      } else {
        return { complete: true, data: formData as T };
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return { complete: false };
    }
  };

  const back = useCallback(() => {
    if (currentStepIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStepIndex(currentStepIndex - 1);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentStepIndex]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field as string];
        return newErrs;
      });
    }
  }, [errors]);

  const setFormState = useCallback((data: Partial<T>) => {
    setFormData(data);
  }, []);

  const jumpToStep = useCallback((stepId: string) => {
    const stepIndex = visibleSteps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStepIndex(stepIndex);
        setIsTransitioning(false);
      }, 300);
    }
  }, [visibleSteps, currentStepIndex]);

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    try {
      await currentStep.schema.parseAsync(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [currentStep, formData]);

  return {
    step: currentStep,
    index: currentStepIndex,
    totalSteps: visibleSteps.length,
    isFirst: currentStepIndex === 0,
    isLast: currentStepIndex === visibleSteps.length - 1,
    data: formData,
    errors,
    isTransitioning,
    next,
    back,
    updateField,
    setFormState,
    jumpToStep,
    validateCurrentStep,
    progress: ((currentStepIndex + 1) / visibleSteps.length) * 100
  };
}

