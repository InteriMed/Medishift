# FLOWS SYSTEM

## Overview

The Flows System is a **Schema-First** architecture for managing multi-step frontend processes (Wizards, Onboarding, Forms). It treats multi-page forms as **State Machines** where Zod schemas dictate navigation rules.

## Architecture

```
src/services/flows/
├── types.ts              # Flow Definition Types
├── engine.ts             # useFlow Hook (State Machine Engine)
├── index.ts              # Public API
└── catalog/              # Flow Definitions by Domain
    └── onboarding/
        ├── index.ts      # Flow Definition
        └── schemas.ts    # Step-by-Step Validation Schemas
```

## Core Concepts

### 1. Flow Definition

A Flow is a structured journey with:
- **Steps**: Sequential pages with validation rules
- **Schemas**: Zod validation for each step
- **Conditions**: Dynamic step visibility based on data
- **Actions**: Backend action to execute on completion

### 2. Flow Step

Each step has:
- `id`: Unique identifier
- `label`: Display name
- `path`: URL route segment
- `schema`: Zod schema for validation
- `condition`: Optional function to show/hide step

### 3. Flow Engine (`useFlow`)

The brain that:
- ✅ Enforces validation before navigation
- ✅ Manages form state and errors
- ✅ Handles transitions and animations
- ✅ Filters steps based on conditions
- ✅ Provides progress tracking

## Usage

### 1. Define Your Flow

```typescript
import { z } from "zod";
import { FlowDefinition } from "@/services/flows/types";

// STEP SCHEMAS
const Step1 = z.object({
  role: z.enum(['worker', 'company', 'chain'])
});

const Step2 = z.object({
  termsAccepted: z.boolean().refine(val => val === true)
});

// COMBINED SCHEMA
const CombinedSchema = Step1.merge(Step2);
type MyFlowData = z.infer<typeof CombinedSchema>;

// FLOW DEFINITION
export const MyFlow: FlowDefinition<MyFlowData> = {
  id: "flow.my_flow",
  title: "My Wizard",
  combinedSchema: CombinedSchema,
  submitActionId: "some.action",
  
  steps: [
    {
      id: "role",
      label: "Select Role",
      path: "role",
      schema: Step1,
    },
    {
      id: "terms",
      label: "Accept Terms",
      path: "terms",
      schema: Step2,
      condition: (data) => data.role !== 'chain' // Only show if not chain
    }
  ]
};
```

### 2. Use the Flow in Your Component

```typescript
import { useFlow } from "@/services/flows";
import { MyFlow } from "@/services/flows/catalog/myflow";

export default function MyWizard() {
  const {
    step,           // Current step definition
    data,           // Form data (Partial<T>)
    errors,         // Validation errors
    isTransitioning, // Animation state
    progress,       // Progress percentage
    isFirst,        // Is first step?
    isLast,         // Is last step?
    next,           // Validate & move forward
    back,           // Move backward
    updateField,    // Update single field
    setFormState    // Set entire state
  } = useFlow(MyFlow);

  const handleNext = async () => {
    const result = await next();
    if (result.complete) {
      // All steps done! Submit to backend
      console.log("Submit:", result.data);
    }
  };

  return (
    <div>
      <h1>{step.label}</h1>
      
      {/* Render based on step.id */}
      {step.id === 'role' && (
        <select
          value={data.role || ''}
          onChange={e => updateField('role', e.target.value)}
        >
          <option value="worker">Worker</option>
          <option value="company">Company</option>
        </select>
      )}
      
      {errors.role && <p className="error">{errors.role}</p>}
      
      <button onClick={back} disabled={isFirst}>Back</button>
      <button onClick={handleNext}>
        {isLast ? 'Complete' : 'Next'}
      </button>
    </div>
  );
}
```

## Benefits

### ✅ Decoupled Logic
- Rules live in **one TypeScript file** (`flows/catalog/*/index.ts`)
- UI components don't know the validation rules
- Easy to change flow without touching UI

### ✅ Type Safety
- `formData` is fully typed (`Partial<T>`)
- TypeScript warns if you access fields not in schema
- Auto-completion for field names

### ✅ Auto-Validation
- **Cannot skip steps** - `next()` enforces validation
- Real-time field-level error clearing
- Zod provides rich error messages

### ✅ Dynamic Steps
- Steps shown/hidden based on previous answers
- `condition` function evaluated in real-time
- Flow adapts to user choices

### ✅ Progress Tracking
- Automatic progress calculation
- Only counts visible steps
- Useful for progress bars

### ✅ Schema Reuse
- Share step schemas across flows
- E.g., `Step1_Identity` used in onboarding AND profile edit
- Single source of truth

## Example: Onboarding Flow

```typescript
// flows/catalog/onboarding/schemas.ts
export const Step1_RoleSelection = z.object({
  role: z.enum(['worker', 'company', 'chain'])
});

export const Step2_LegalConsiderations = z.object({
  legalConsiderationsConfirmed: z.boolean().refine(val => val === true)
});

export const Step3_PhoneVerification = z.object({
  phoneVerified: z.boolean().refine(val => val === true),
  phoneData: z.object({
    phoneNumber: z.string(),
    verified: z.boolean()
  })
});

// flows/catalog/onboarding/index.ts
export const OnboardingFlow: FlowDefinition<OnboardingData> = {
  id: "flow.onboarding",
  title: "Account Setup",
  combinedSchema: OnboardingCombinedSchema,
  submitActionId: "profile.update_me",
  steps: [
    { id: "role", label: "Select Role", path: "role", schema: Step1_RoleSelection },
    { id: "legal", label: "Legal", path: "legal", schema: Step2_LegalConsiderations },
    { id: "phone", label: "Phone", path: "phone", schema: Step3_PhoneVerification },
    {
      id: "gln_facility",
      label: "Facility Verification",
      path: "gln-facility",
      schema: Step5_FacilityGLN,
      condition: (data) => data.role === 'company' // Only for companies
    }
  ]
};
```

## Migration from Legacy Onboarding

### OLD (Hardcoded State)
```javascript
const [step, setStep] = useState(1);
const [role, setRole] = useState(null);
const [phoneVerified, setPhoneVerified] = useState(false);

const handleNext = () => {
  // Manual validation
  if (step === 1 && !role) {
    alert("Select a role");
    return;
  }
  if (step === 3 && !phoneVerified) {
    alert("Verify phone");
    return;
  }
  // Manual step logic
  if (step < 5) setStep(step + 1);
};
```

### NEW (Schema-Driven)
```typescript
const { step, data, errors, next, updateField } = useFlow(OnboardingFlow);

// Validation is automatic!
// Conditions are automatic!
// No manual step counting!
```

## API Reference

### `useFlow<T>(flow: FlowDefinition<T>)`

**Returns:**
- `step: FlowStep` - Current step definition
- `index: number` - Current step index (0-based)
- `totalSteps: number` - Total visible steps
- `isFirst: boolean` - Is first step?
- `isLast: boolean` - Is last step?
- `data: Partial<T>` - Current form data
- `errors: Record<string, string>` - Field-level errors
- `isTransitioning: boolean` - Animation state
- `progress: number` - Progress percentage (0-100)
- `next(): Promise<FlowResult<T>>` - Validate & advance
- `back(): void` - Go back one step
- `updateField<K>(field: K, value: T[K]): void` - Update single field
- `setFormState(data: Partial<T>): void` - Set entire state
- `jumpToStep(stepId: string): void` - Jump to specific step
- `validateCurrentStep(): Promise<boolean>` - Validate without advancing

### `FlowResult<T>`
- `complete: boolean` - Is flow complete?
- `data?: T` - Final validated data (only if complete)

## Best Practices

### 1. Split Schemas by Step
```typescript
const Step1 = z.object({ field1: z.string() });
const Step2 = z.object({ field2: z.number() });
const Combined = Step1.merge(Step2);
```

### 2. Use `.partial()` for Optional Steps
```typescript
{
  id: "optional_step",
  schema: SomeSchema.partial(), // All fields optional
  condition: (data) => data.needsThisStep
}
```

### 3. Complex Validation with `.superRefine()`
```typescript
const Step2 = z.object({
  licenseNumber: z.string().optional()
}).superRefine((data, ctx) => {
  if (someCondition && !data.licenseNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "License required",
      path: ["licenseNumber"]
    });
  }
});
```

### 4. Save Progress
```typescript
const handleNext = async () => {
  const result = await next();
  
  // Save after each step
  await saveProgress(data);
  
  if (result.complete) {
    // Final submission
    await execute(flow.submitActionId, result.data);
  }
};
```

### 5. Load Saved Progress
```typescript
useEffect(() => {
  loadProgress().then(savedData => {
    if (savedData) {
      setFormState(savedData);
      if (savedData.step) {
        jumpToStep(savedData.step);
      }
    }
  });
}, []);
```

## Integration with Actions

Flows complement the Actions system:

```typescript
import { useAction } from "@/services/actions/hook";
import { useFlow } from "@/services/flows";

const { execute } = useAction();
const { data, next } = useFlow(OnboardingFlow);

const handleComplete = async () => {
  const result = await next();
  
  if (result.complete) {
    // Submit to backend action
    await execute('profile.complete_onboarding', result.data);
  }
};
```

## Comparison: Flows vs Actions

| Aspect | Actions | Flows |
|--------|---------|-------|
| **Purpose** | Backend operations | Frontend journeys |
| **Location** | `actions/catalog/` | `flows/catalog/` |
| **Type** | Single atomic operation | Multi-step process |
| **Validation** | Server-side | Client-side |
| **Examples** | Create contract, Send message | Onboarding, Application wizard |

Both follow **Schema-First Philosophy** and use Zod for validation.

## Future Extensions

- **Multi-path flows**: Branching based on conditions
- **Flow composition**: Embed sub-flows
- **Resumable flows**: Save/restore with unique tokens
- **Flow analytics**: Track drop-off rates per step
- **Flow testing**: Unit tests for step transitions

## Resources

- **Zod Documentation**: https://zod.dev
- **Actions System**: `services/actions/README.md`
- **Onboarding Example**: `flows/catalog/onboarding/`

