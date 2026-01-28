import { z } from "zod";

export interface FlowStep<T = any> {
  id: string;
  label: string;
  path: string;
  schema: z.ZodType<any>;
  condition?: (data: Partial<T>) => boolean;
}

export interface FlowDefinition<T = any> {
  id: string;
  title: string;
  steps: FlowStep<T>[];
  combinedSchema: z.ZodType<T>;
  submitActionId?: string;
}

export interface FlowState<T = any> {
  currentStepIndex: number;
  formData: Partial<T>;
  errors: Record<string, string>;
  isTransitioning: boolean;
}

export interface FlowResult<T = any> {
  complete: boolean;
  data?: T;
}

