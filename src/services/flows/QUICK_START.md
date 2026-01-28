# FLOWS SYSTEM - QUICK START

## What is the Flows System?

A **Schema-First** architecture for managing multi-step frontend processes. Instead of writing `if (step === 2) validate()`, you define validation rules once in Zod schemas.

## 30-Second Example

```typescript
// 1. DEFINE THE FLOW (flows/catalog/myflow/index.ts)
import { z } from "zod";

const Step1 = z.object({
  email: z.string().email("Valid email required")
});

const Step2 = z.object({
  password: z.string().min(8, "Min 8 characters")
});

export const SignupFlow: FlowDefinition = {
  id: "flow.signup",
  title: "Sign Up",
  combinedSchema: Step1.merge(Step2),
  steps: [
    { id: "email", label: "Email", path: "email", schema: Step1 },
    { id: "password", label: "Password", path: "password", schema: Step2 }
  ]
};

// 2. USE IN COMPONENT
import { useFlow } from '@/services/flows';
import { SignupFlow } from '@/services/flows/catalog/signup';

function SignupWizard() {
  const { step, data, errors, next, updateField, isLast } = useFlow(SignupFlow);

  const handleNext = async () => {
    const result = await next();  // Automatic validation!
    if (result.complete) {
      // Submit to backend
      console.log("Valid data:", result.data);
    }
  };

  return (
    <div>
      <h1>{step.label}</h1>
      
      {step.id === 'email' && (
        <input
          type="email"
          value={data.email || ''}
          onChange={e => updateField('email', e.target.value)}
        />
      )}
      {errors.email && <p className="error">{errors.email}</p>}
      
      {step.id === 'password' && (
        <input
          type="password"
          value={data.password || ''}
          onChange={e => updateField('password', e.target.value)}
        />
      )}
      {errors.password && <p className="error">{errors.password}</p>}
      
      <button onClick={handleNext}>
        {isLast ? 'Complete' : 'Next'}
      </button>
    </div>
  );
}
```

## Key Features

### ✅ Automatic Validation
```javascript
// Just call next() - validation happens automatically
const result = await next();
if (result.complete) {
  // All steps validated!
}
```

### ✅ Conditional Steps
```typescript
{
  id: "license",
  schema: LicenseSchema,
  condition: (data) => data.role === 'doctor'  // Only doctors see this
}
```

### ✅ Type Safety
```typescript
type MyData = z.infer<typeof CombinedSchema>;
// TypeScript knows all fields!

updateField('email', 'test@example.com');  // ✅ Valid
updateField('invalidField', 'value');      // ❌ TypeScript error
```

### ✅ Progress Tracking
```javascript
const { progress } = useFlow(MyFlow);
// Automatically calculated: (currentStep / totalSteps) * 100
```

### ✅ Error Handling
```javascript
const { errors } = useFlow(MyFlow);
// Errors populated automatically from Zod
{errors.email && <span>{errors.email}</span>}
```

## Real-World Example: Onboarding

The onboarding flow has been refactored to use this system:

**Before:**
```javascript
const [step, setStep] = useState(1);
const [role, setRole] = useState(null);
const [phoneVerified, setPhoneVerified] = useState(false);
// ... 5+ more useState calls

const handleNext = () => {
  if (step === 1 && !role) {
    alert("Select a role");
    return;
  }
  // ... manual validation for each step
  setStep(step + 1);
};
```

**After:**
```javascript
const { step, data, next, updateField } = useFlow(OnboardingFlow);

const handleNext = async () => {
  const result = await next();  // That's it!
  if (!result.complete) {
    await saveProgress();
  } else {
    handleComplete();
  }
};
```

## File Structure

```
src/services/flows/
├── types.ts              # Core interfaces
├── engine.ts             # useFlow() hook
├── index.ts              # Exports
├── README.md             # Full documentation
├── IMPLEMENTATION_GUIDE.md  # Implementation details
├── MIGRATION_GUIDE.md    # Migration from legacy
└── catalog/
    └── onboarding/
        ├── index.ts      # OnboardingFlow definition
        └── schemas.ts    # Zod validation schemas
```

## API

### `useFlow<T>(flow: FlowDefinition<T>)`

Returns:
- `step` - Current step definition
- `data` - Form data (Partial<T>)
- `errors` - Validation errors
- `next()` - Validate & advance (returns Promise<FlowResult>)
- `back()` - Go back one step
- `updateField(field, value)` - Update a field
- `isFirst` - Is first step?
- `isLast` - Is last step?
- `progress` - Progress percentage (0-100)
- `isTransitioning` - Animation state

## Common Patterns

### Pattern 1: Simple Wizard
```typescript
const { step, data, next, updateField } = useFlow(MyFlow);
```

### Pattern 2: Save Progress
```typescript
const handleNext = async () => {
  const result = await next();
  if (!result.complete) {
    await saveToDatabase(data);
  } else {
    await submitFinalData(result.data);
  }
};
```

### Pattern 3: Conditional Steps
```typescript
// In flow definition
{
  id: "company_details",
  schema: CompanySchema,
  condition: (data) => data.userType === 'company'
}
```

### Pattern 4: Complex Validation
```typescript
const StepSchema = z.object({
  field1: z.string(),
  field2: z.number()
}).superRefine((data, ctx) => {
  if (data.field1.length > 10 && data.field2 < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid combination",
      path: ["field1"]
    });
  }
});
```

### Pattern 5: Integration with Actions
```typescript
import { useAction } from '@/services/actions/hook';
import { useFlow } from '@/services/flows';

const { execute } = useAction();
const { next } = useFlow(MyFlow);

const handleComplete = async () => {
  const result = await next();
  if (result.complete) {
    // Submit to backend using Actions system
    await execute('profile.complete_setup', result.data);
  }
};
```

## Benefits Over Manual State Management

| Aspect | Manual State | Flows System |
|--------|--------------|--------------|
| **Validation** | Write checks in each handler | Define once in schema |
| **Type Safety** | None | Full TypeScript support |
| **Step Logic** | Hardcoded if/else | Declarative conditions |
| **Error Handling** | Manual error state | Automatic from Zod |
| **Progress** | Manual calculation | Automatic |
| **Testing** | Test entire component | Test flow definition separately |
| **Reusability** | Copy/paste code | Reuse schemas & flows |

## When to Use Flows

✅ **Use Flows for:**
- Multi-step forms
- Onboarding wizards
- Application processes
- Survey flows
- Checkout processes
- Profile setup

❌ **Don't Use Flows for:**
- Single-page forms
- Simple modals
- Navigation menus
- Standalone forms with no steps

## Getting Started

### 1. Create a Flow Definition

```bash
# Create directory
mkdir -p src/services/flows/catalog/myflow

# Create files
touch src/services/flows/catalog/myflow/index.ts
touch src/services/flows/catalog/myflow/schemas.ts
```

### 2. Define Schemas

```typescript
// schemas.ts
import { z } from "zod";

export const Step1 = z.object({
  email: z.string().email()
});

export const Step2 = z.object({
  password: z.string().min(8)
});

export const CombinedSchema = Step1.merge(Step2);
export type MyFlowData = z.infer<typeof CombinedSchema>;
```

### 3. Create Flow Definition

```typescript
// index.ts
import { FlowDefinition } from '../../types';
import { CombinedSchema, MyFlowData, Step1, Step2 } from './schemas';

export const MyFlow: FlowDefinition<MyFlowData> = {
  id: "flow.my_flow",
  title: "My Wizard",
  combinedSchema: CombinedSchema,
  steps: [
    { id: "step1", label: "Email", path: "email", schema: Step1 },
    { id: "step2", label: "Password", path: "password", schema: Step2 }
  ]
};
```

### 4. Use in Component

```typescript
import { useFlow } from '@/services/flows';
import { MyFlow } from '@/services/flows/catalog/myflow';

function MyWizard() {
  const { step, data, errors, next, updateField } = useFlow(MyFlow);
  // ... your UI
}
```

## Documentation

- **Complete Guide**: `src/services/flows/README.md`
- **Implementation**: `src/services/flows/IMPLEMENTATION_GUIDE.md`
- **Migration**: `src/services/flows/MIGRATION_GUIDE.md`
- **Onboarding Example**: `src/dashboard/onboarding/OnboardingPageRefactored.js`

## Questions?

1. Check the README: `src/services/flows/README.md`
2. Review the onboarding example
3. Look at Zod docs: https://zod.dev
4. Review the Actions system for similar patterns

## Next Steps

1. ✅ Flow system implemented
2. ✅ Onboarding refactored as example
3. ⏳ Test the refactored onboarding
4. ⏳ Deploy with feature flag
5. ⏳ Migrate other wizards (profile setup, applications, etc.)

