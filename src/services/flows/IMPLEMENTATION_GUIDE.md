# FLOWS IMPLEMENTATION GUIDE

## Overview

This guide documents the implementation of the **Flow Definition Engine** for managing multi-step frontend processes in the Interimed codebase.

## What Was Implemented

### 1. Core Flow System

Created in `src/services/flows/`:

```
flows/
├── types.ts              # FlowDefinition, FlowStep, FlowState interfaces
├── engine.ts             # useFlow() hook - the state machine
├── index.ts              # Public exports
├── README.md             # Complete documentation
└── catalog/
    └── onboarding/
        ├── index.ts      # OnboardingFlow definition
        └── schemas.ts    # Zod validation schemas
```

### 2. Type Definitions (`types.ts`)

```typescript
export interface FlowStep<T> {
  id: string;                        // Unique identifier
  label: string;                     // Display name
  path: string;                      // URL route segment
  schema: z.ZodType<any>;           // Validation rules
  condition?: (data: Partial<T>) => boolean;  // Show/hide logic
}

export interface FlowDefinition<T> {
  id: string;                        // Unique flow ID
  title: string;                     // Display title
  steps: FlowStep<T>[];             // Array of steps
  combinedSchema: z.ZodType<T>;     // Master schema
  submitActionId?: string;           // Backend action to call
}
```

### 3. Flow Engine (`engine.ts`)

The `useFlow()` hook provides:

- **State Management**: `formData`, `errors`, `currentStepIndex`
- **Navigation**: `next()`, `back()`, `jumpToStep()`
- **Validation**: Automatic Zod validation on `next()`
- **Conditional Steps**: Filters steps based on `condition` functions
- **Transitions**: Built-in `isTransitioning` state for animations
- **Progress**: Automatic progress calculation

### 4. Onboarding Flow Definition

Created schemas for each step:

1. **Role Selection** - Choose worker/company/chain
2. **Legal Considerations** - Accept terms, declare employment status
3. **Phone Verification** - Verify phone number
4. **Professional GLN** - Verify professional credentials (conditional)
5. **Facility GLN** - Verify facility info (only for companies)
6. **Commercial Registry** - Verify organization (only for chains)

### 5. Refactored Onboarding Component

Created `OnboardingPageRefactored.js` that:

- ✅ Uses `useFlow()` hook instead of manual state management
- ✅ Validates automatically on navigation
- ✅ Handles conditional steps (facility vs chain paths)
- ✅ Maintains backward compatibility with existing UI/UX
- ✅ Preserves all existing features (save progress, phone verification, etc.)

## Key Benefits

### Before (Legacy Approach)

```javascript
// MANUAL STATE MANAGEMENT
const [step, setStep] = useState(1);
const [role, setRole] = useState(null);
const [phoneVerified, setPhoneVerified] = useState(false);
const [legalAccepted, setLegalAccepted] = useState(false);

// MANUAL VALIDATION
const handleNext = () => {
  if (step === 1 && !role) {
    alert("Select a role");
    return;
  }
  if (step === 2 && !legalAccepted) {
    alert("Accept terms");
    return;
  }
  // ... more manual checks
  setStep(step + 1);
};

// HARDCODED STEP LOGIC
const maxStep = role === 'company' ? 5 : 4;
if (step < maxStep) {
  setStep(step + 1);
}
```

### After (Flow System)

```javascript
// AUTOMATIC STATE MANAGEMENT
const { step, data, errors, next, updateField } = useFlow(OnboardingFlow);

// AUTOMATIC VALIDATION
const handleNext = async () => {
  const result = await next();  // Validates automatically!
  if (result.complete) {
    // Submit to backend
  }
};

// AUTOMATIC CONDITIONAL STEPS
// The flow engine handles this based on step.condition
```

## Architecture Principles

### 1. Schema-First Philosophy

Validation rules are **defined once** in Zod schemas:

```typescript
const Step2_LegalConsiderations = z.object({
  legalConsiderationsConfirmed: z.boolean().refine(val => val === true, {
    message: "You must accept the terms of service"
  })
});
```

The UI components don't know the rules - they just render based on `errors`.

### 2. Decoupled Logic

**Business Rules** (in `flows/catalog/onboarding/index.ts`):
- What steps exist?
- In what order?
- What validation rules?
- When to show/hide steps?

**UI Components** (in `OnboardingPageRefactored.js`):
- How to render each step?
- What animations to use?
- How to display errors?

### 3. Type Safety

```typescript
type OnboardingData = z.infer<typeof OnboardingCombinedSchema>;

// TypeScript knows all fields!
updateField('role', 'worker');        // ✅ Valid
updateField('invalidField', 'test'); // ❌ TypeScript error
```

### 4. Conditional Steps

Steps can be shown/hidden based on previous answers:

```typescript
{
  id: "gln_facility",
  label: "Facility Verification",
  path: "gln-facility",
  schema: Step5_FacilityGLN.partial(),
  condition: (data) => data.role === 'company'  // Only for companies
}
```

The engine automatically filters visible steps and recalculates progress.

## Migration Strategy

### Phase 1: Side-by-Side (CURRENT STATE)

- ✅ Flow system implemented
- ✅ Original `OnboardingPage.js` unchanged
- ✅ New `OnboardingPageRefactored.js` created
- ⚠️ Not yet integrated into routes

**To test the new implementation:**

1. Import `OnboardingPageRefactored` in your route config
2. Compare behavior with original
3. Verify all edge cases work

### Phase 2: Integration (NEXT STEP)

Replace the old component:

```javascript
// In your routes file:
// OLD:
import OnboardingPage from './dashboard/onboarding/OnboardingPage';

// NEW:
import OnboardingPage from './dashboard/onboarding/OnboardingPageRefactored';
```

### Phase 3: Cleanup

Once confident:
1. Delete `OnboardingPage.js` (old version)
2. Rename `OnboardingPageRefactored.js` → `OnboardingPage.js`
3. Remove legacy state management code

## Usage Examples

### Example 1: Simple Flow

```typescript
// Define schemas
const Step1 = z.object({
  email: z.string().email()
});

const Step2 = z.object({
  password: z.string().min(8)
});

// Create flow
export const SignupFlow: FlowDefinition = {
  id: "flow.signup",
  title: "Sign Up",
  combinedSchema: Step1.merge(Step2),
  steps: [
    { id: "email", label: "Email", path: "email", schema: Step1 },
    { id: "password", label: "Password", path: "password", schema: Step2 }
  ]
};

// Use in component
const { step, data, errors, next, updateField } = useFlow(SignupFlow);
```

### Example 2: Conditional Steps

```typescript
const ProfileFlow: FlowDefinition = {
  id: "flow.profile",
  title: "Profile Setup",
  steps: [
    { 
      id: "role", 
      schema: RoleSchema 
    },
    { 
      id: "license", 
      schema: LicenseSchema,
      condition: (data) => data.role === 'doctor'  // Only doctors need license
    }
  ]
};
```

### Example 3: Complex Validation

```typescript
const Step3 = z.object({
  licenseNumber: z.string().optional(),
  yearsExperience: z.number()
}).superRefine((data, ctx) => {
  // Cross-field validation
  if (data.yearsExperience > 5 && !data.licenseNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "License required for experienced professionals",
      path: ["licenseNumber"]
    });
  }
});
```

## API Reference

### `useFlow<T>(flow: FlowDefinition<T>)`

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `step` | `FlowStep` | Current step definition |
| `index` | `number` | Current step index (0-based) |
| `totalSteps` | `number` | Total visible steps |
| `isFirst` | `boolean` | Is first step? |
| `isLast` | `boolean` | Is last step? |
| `data` | `Partial<T>` | Current form data |
| `errors` | `Record<string, string>` | Field errors |
| `isTransitioning` | `boolean` | Animation state |
| `progress` | `number` | Progress (0-100) |
| `next()` | `Promise<FlowResult>` | Validate & advance |
| `back()` | `void` | Go back |
| `updateField(field, value)` | `void` | Update field |
| `setFormState(data)` | `void` | Set entire state |
| `jumpToStep(stepId)` | `void` | Jump to step |
| `validateCurrentStep()` | `Promise<boolean>` | Validate without advancing |

### `FlowResult<T>`

```typescript
{
  complete: boolean;  // True if all steps done
  data?: T;           // Validated data (only if complete)
}
```

## Testing Checklist

Before replacing the old onboarding:

- [ ] Test all role paths (worker, company, chain)
- [ ] Test phone verification flow
- [ ] Test GLN verification steps
- [ ] Test conditional step visibility
- [ ] Test navigation (next/back)
- [ ] Test validation errors display correctly
- [ ] Test save/load progress
- [ ] Test completion and redirect
- [ ] Test restricted services modal (for facility workers)
- [ ] Test contact form popup
- [ ] Test animations and transitions
- [ ] Test on mobile/tablet/desktop
- [ ] Test with different languages (fr/en/de/it)

## Future Enhancements

### 1. Flow Registry

Create a central registry like the actions registry:

```typescript
// flows/registry.ts
import { OnboardingFlow } from './catalog/onboarding';
import { ApplicationFlow } from './catalog/application';

export const FLOW_REGISTRY = {
  'flow.onboarding': OnboardingFlow,
  'flow.application': ApplicationFlow,
  // ... more flows
};

// Use anywhere
const flow = FLOW_REGISTRY['flow.onboarding'];
```

### 2. Flow Persistence

Save/restore flow state with tokens:

```typescript
const token = await saveFlowState(flowId, data);
// Later...
const resumedState = await loadFlowState(token);
```

### 3. Multi-Path Flows

Support branching:

```typescript
{
  id: "payment",
  branches: {
    credit_card: [...steps],
    paypal: [...steps],
    invoice: [...steps]
  }
}
```

### 4. Flow Analytics

Track metrics:

```typescript
const { trackStepView, trackStepComplete, trackFlowAbandon } = useFlowAnalytics();
```

### 5. Flow Testing

Unit tests for flows:

```typescript
test('onboarding flow - worker path', async () => {
  const { next, updateField, data } = renderFlow(OnboardingFlow);
  
  updateField('role', 'worker');
  await next();
  
  updateField('legalConsiderationsConfirmed', true);
  await next();
  
  expect(data.role).toBe('worker');
});
```

## Comparison: Flows vs Actions

| Aspect | Actions | Flows |
|--------|---------|-------|
| **Purpose** | Backend operations | Frontend journeys |
| **Location** | `actions/catalog/` | `flows/catalog/` |
| **Type** | Single operation | Multi-step process |
| **Validation** | Server-side | Client-side (Zod) |
| **State** | Stateless | Stateful |
| **Examples** | Create contract, Send email | Onboarding, Application wizard |
| **Hook** | `useAction()` | `useFlow()` |

Both follow **Schema-First Philosophy**.

## Integration with Actions

Flows complement actions:

```typescript
import { useAction } from '@/services/actions/hook';
import { useFlow } from '@/services/flows';

const { execute } = useAction();
const { data, next } = useFlow(OnboardingFlow);

const handleComplete = async () => {
  const result = await next();
  
  if (result.complete) {
    // Submit to backend using action
    await execute('profile.complete_onboarding', result.data);
  }
};
```

## Resources

- **Flow System README**: `src/services/flows/README.md`
- **Onboarding Example**: `src/services/flows/catalog/onboarding/`
- **Refactored Component**: `src/dashboard/onboarding/OnboardingPageRefactored.js`
- **Actions System**: `src/services/actions/`
- **Zod Documentation**: https://zod.dev

## Support

For questions or issues:
1. Check the README: `src/services/flows/README.md`
2. Review the example: `OnboardingPageRefactored.js`
3. Consult the Actions system for similar patterns

