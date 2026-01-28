# ONBOARDING MIGRATION GUIDE

## From Legacy State Management to Flow System

This guide documents the migration of `OnboardingPage.js` from manual state management to the Flow Definition Engine.

## What Changed?

### State Management

**BEFORE:**
```javascript
const [step, setStep] = useState(1);
const [role, setRole] = useState(null);
const [belongsToFacility, setBelongsToFacility] = useState(false);
const [phoneVerified, setPhoneVerified] = useState(false);
const [phoneData, setPhoneData] = useState({ phoneNumber: '', verified: false });
const [legalConsiderationsConfirmed, setLegalConsiderationsConfirmed] = useState(false);
```

**AFTER:**
```javascript
const {
  step,                    // Current step definition
  data,                    // { role, belongsToFacility, phoneVerified, etc. }
  errors,                  // Validation errors
  next,                    // Navigate forward
  back,                    // Navigate back
  updateField,             // Update a field
  isTransitioning          // Animation state
} = useFlow(OnboardingFlow);
```

### Validation

**BEFORE:**
```javascript
const canProceed = () => {
  if (step === 1) return !!role;
  if (step === 2) return legalConsiderationsConfirmed;
  if (step === 3) {
    if (phoneVerified) return true;
    const isValid = phoneInternalStep === 1 ? isPhoneValid : true;
    return isValid;
  }
  return true;
};
```

**AFTER:**
```javascript
// Validation happens automatically in next()
// Schemas define the rules in flows/catalog/onboarding/schemas.ts
const result = await next();
if (result.complete) {
  // All validations passed!
}
```

### Step Navigation

**BEFORE:**
```javascript
const maxStep = (role === 'company' || role === 'chain') ? 5 : 4;
if (step < maxStep) {
  setStep(step + 1);
} else {
  handleComplete();
}
```

**AFTER:**
```javascript
// Flow engine handles conditional steps automatically
const result = await next();
if (!result.complete) {
  // Moved to next step
} else {
  // Flow complete
  handleComplete();
}
```

### Conditional Steps

**BEFORE:**
```javascript
// Hardcoded in JSX
{step === 5 && role === 'company' && (
  <FacilityGLNVerification />
)}

{step === 5 && role === 'chain' && (
  <CommercialRegistryVerification />
)}
```

**AFTER:**
```javascript
// Defined in flow definition
{
  id: "gln_facility",
  schema: Step5_FacilityGLN.partial(),
  condition: (data) => data.role === 'company'
},
{
  id: "commercial_registry",
  schema: Step5_CommercialRegistry.partial(),
  condition: (data) => data.role === 'chain'
}
```

## File Structure

### New Files Created

```
src/services/flows/
├── types.ts                                    # Type definitions
├── engine.ts                                   # useFlow hook
├── index.ts                                    # Exports
├── README.md                                   # Documentation
├── IMPLEMENTATION_GUIDE.md                     # This guide
└── catalog/
    └── onboarding/
        ├── index.ts                            # Flow definition
        └── schemas.ts                          # Zod schemas

src/dashboard/onboarding/
├── OnboardingPage.js                           # ORIGINAL (unchanged)
└── OnboardingPageRefactored.js                 # NEW (using flows)
```

### Modified Files

- `FRONTEND_REFACTORING_GUIDE.md` - Added Flows section

## Step-by-Step Mapping

### Step 1: Role Selection

**Schema:**
```typescript
const Step1_RoleSelection = z.object({
  role: z.enum(['worker', 'company', 'chain'], {
    errorMap: () => ({ message: "Please select a role" })
  })
});
```

**UI Changes:**
- `onClick={() => setRole(r.id)}` → `onClick={() => updateField('role', r.id)}`
- `role === r.id` → `data.role === r.id`

### Step 2: Legal Considerations

**Schema:**
```typescript
const Step2_LegalConsiderations = z.object({
  role: z.enum(['worker', 'company', 'chain']),
  belongsToFacility: z.boolean().optional(),
  legalConsiderationsConfirmed: z.boolean().refine(val => val === true, {
    message: "You must accept the terms of service"
  })
});
```

**UI Changes:**
- `belongsToFacility` → `data.belongsToFacility`
- `setBelongsToFacility(val)` → `updateField('belongsToFacility', val)`
- `legalConsiderationsConfirmed` → `data.legalConsiderationsConfirmed`

### Step 3: Phone Verification

**Schema:**
```typescript
const Step3_PhoneVerification = z.object({
  phoneVerified: z.boolean().refine(val => val === true, {
    message: "Phone verification is required"
  }),
  phoneData: z.object({
    phoneNumber: z.string().min(1, "Phone number is required"),
    verified: z.boolean()
  })
});
```

**UI Changes:**
- Special handling for internal phone steps (kept as local state)
- `phoneVerified` → `data.phoneVerified`
- `setPhoneData()` → `updateField('phoneData', phoneData)`

### Step 4: Professional GLN

**Schema:**
```typescript
const Step4_ProfessionalGLN = z.object({
  glnVerified: z.boolean().optional(),
  glnNumber: z.string().optional()
});
```

**Condition:**
```typescript
condition: (data) => {
  return data.role === 'worker' || data.role === 'company' || data.role === 'chain';
}
```

### Step 5a: Facility GLN (Companies Only)

**Schema:**
```typescript
const Step5_FacilityGLN = z.object({
  facilityGlnVerified: z.boolean().optional(),
  facilityGlnNumber: z.string().optional()
});
```

**Condition:**
```typescript
condition: (data) => data.role === 'company'
```

### Step 5b: Commercial Registry (Chains Only)

**Schema:**
```typescript
const Step5_CommercialRegistry = z.object({
  commercialRegistryVerified: z.boolean().optional(),
  uidNumber: z.string().optional()
});
```

**Condition:**
```typescript
condition: (data) => data.role === 'chain'
```

## Key Differences

### Progress Calculation

**BEFORE:**
```javascript
// Manual calculation
const maxStep = role === 'company' ? 5 : 4;
const progress = (step / maxStep) * 100;
```

**AFTER:**
```javascript
// Automatic from useFlow
const { progress } = useFlow(OnboardingFlow);  // Always correct!
```

### Step Indicators

**BEFORE:**
```javascript
[1, 2, 3, 4, 5].filter(s => {
  if (role === 'chain') return s <= 3;
  if (role === 'company') return s <= 5;
  return s <= 4;
}).map(...)
```

**AFTER:**
```javascript
// Just use totalSteps from flow
Array.from({ length: totalSteps }, (_, i) => i + 1).map(...)
```

### Error Handling

**BEFORE:**
```javascript
// Manual error checking
if (!role) {
  alert("Please select a role");
  return;
}
```

**AFTER:**
```javascript
// Automatic from Zod
const result = await next();
// Errors automatically populated in 'errors' object
{errors.role && <p className="error">{errors.role}</p>}
```

## Testing Strategy

### 1. Unit Tests (Future)

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useFlow } from '@/services/flows';
import { OnboardingFlow } from '@/services/flows/catalog/onboarding';

test('worker flow has 4 steps', () => {
  const { result } = renderHook(() => useFlow(OnboardingFlow));
  
  act(() => {
    result.current.updateField('role', 'worker');
  });
  
  expect(result.current.totalSteps).toBe(4);
});

test('company flow has 5 steps', () => {
  const { result } = renderHook(() => useFlow(OnboardingFlow));
  
  act(() => {
    result.current.updateField('role', 'company');
  });
  
  expect(result.current.totalSteps).toBe(5);
});
```

### 2. Integration Tests

Test scenarios:
- [ ] Professional worker onboarding (4 steps)
- [ ] Facility company onboarding (5 steps)
- [ ] Organization chain onboarding (5 steps, different last step)
- [ ] Worker employed by facility (restricted services modal)
- [ ] Phone verification flow (send code → verify)
- [ ] Back navigation preserves data
- [ ] Save/restore progress
- [ ] Validation errors display correctly

### 3. Manual Testing Checklist

- [ ] Start fresh onboarding as professional
- [ ] Start fresh onboarding as facility
- [ ] Test all three role paths
- [ ] Test phone verification
- [ ] Test GLN verification
- [ ] Test back button at each step
- [ ] Test save/reload progress
- [ ] Test restricted services modal
- [ ] Test completion and redirect
- [ ] Test on mobile
- [ ] Test in French
- [ ] Test in German

## Performance Considerations

### Before
- 7+ `useState` calls
- Manual re-renders on every field change
- Complex conditional logic in every render

### After
- 1 `useFlow` call
- Optimized with `useCallback`
- Conditional logic runs once per step change

### Optimization Tips

1. **Memoize expensive renders:**
```javascript
const StepContent = useMemo(() => {
  switch (step.id) {
    case 'role': return <RoleSelection />;
    case 'legal': return <LegalStep />;
    // ...
  }
}, [step.id]);
```

2. **Debounce field updates:**
```javascript
const debouncedUpdate = useMemo(
  () => debounce(updateField, 300),
  [updateField]
);
```

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   - Revert route to use `OnboardingPage.js` (original)
   - No database changes needed

2. **Partial Rollback:**
   - Keep flows system
   - Create hybrid component mixing old/new approaches

3. **Forward Fix:**
   - Fix bugs in `OnboardingPageRefactored.js`
   - Update flow schemas if validation too strict

## Migration Checklist

### Before Deployment

- [ ] All flows tests pass
- [ ] No linter errors
- [ ] All edge cases tested
- [ ] Performance profiling done
- [ ] Accessibility tested
- [ ] Multi-language tested
- [ ] Mobile/tablet tested

### Deployment

- [ ] Deploy with feature flag (optional)
- [ ] Monitor error logs
- [ ] Monitor completion rates
- [ ] A/B test if possible
- [ ] Gather user feedback

### After Deployment

- [ ] Monitor for 48 hours
- [ ] Analyze drop-off rates per step
- [ ] Compare metrics with old version
- [ ] Document any issues
- [ ] If stable for 1 week, delete old file

## Common Pitfalls

### 1. Forgetting to await `next()`

❌ **Wrong:**
```javascript
const handleNext = () => {
  next();  // Not awaited!
  saveProgress();
};
```

✅ **Correct:**
```javascript
const handleNext = async () => {
  const result = await next();
  if (!result.complete) {
    await saveProgress();
  }
};
```

### 2. Mutating `data` directly

❌ **Wrong:**
```javascript
data.role = 'worker';  // Direct mutation!
```

✅ **Correct:**
```javascript
updateField('role', 'worker');
```

### 3. Not checking `result.complete`

❌ **Wrong:**
```javascript
await next();
handleComplete();  // Called even if not on last step!
```

✅ **Correct:**
```javascript
const result = await next();
if (result.complete) {
  handleComplete();
}
```

### 4. Overriding condition logic in UI

❌ **Wrong:**
```javascript
// Hardcoding step visibility in JSX
{step.id === 'gln_facility' && data.role === 'company' && (
  <FacilityVerification />
)}
```

✅ **Correct:**
```javascript
// Trust the flow engine
{step.id === 'gln_facility' && (
  <FacilityVerification />
)}
```

## Future Improvements

### 1. Multi-Language Schemas

```typescript
const Step1_RoleSelection = (t: TFunction) => z.object({
  role: z.enum(['worker', 'company', 'chain'], {
    errorMap: () => ({ message: t('onboarding.errors.selectRole') })
  })
});
```

### 2. Server-Side Validation

```typescript
// After client-side validation passes
const result = await next();
if (result.complete) {
  // Re-validate on server
  await execute('onboarding.validate', result.data);
}
```

### 3. Flow Analytics

```typescript
const { trackStep } = useFlowAnalytics();

useEffect(() => {
  trackStep(step.id, {
    role: data.role,
    timestamp: Date.now()
  });
}, [step.id]);
```

### 4. Resume Tokens

```typescript
// Save progress with resume token
const token = await saveFlowProgress(flow.id, data);

// Send via email
sendEmail({
  subject: "Resume your onboarding",
  body: `Continue at: /onboarding?token=${token}`
});
```

## Questions & Answers

**Q: Can I use flows for other wizards?**
A: Yes! Create a new flow definition in `flows/catalog/yourFlow/`.

**Q: How do I add custom validation?**
A: Use `.superRefine()` in your Zod schema for complex logic.

**Q: Can I skip steps programmatically?**
A: Yes, use `jumpToStep(stepId)`.

**Q: How do I test a flow?**
A: Use `renderHook` from `@testing-library/react-hooks`.

**Q: Can I have multiple flows in one page?**
A: Yes, call `useFlow()` multiple times with different definitions.

**Q: How do I integrate with the Actions system?**
A: Set `submitActionId` in your flow definition, then call `execute(flow.submitActionId, result.data)`.

## Support

- **Flow System README**: `src/services/flows/README.md`
- **Implementation Guide**: `src/services/flows/IMPLEMENTATION_GUIDE.md`
- **Example Component**: `src/dashboard/onboarding/OnboardingPageRefactored.js`
- **Zod Docs**: https://zod.dev

