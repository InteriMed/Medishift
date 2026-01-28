# SERVICE TREE MIGRATION STATUS

## Critical Finding

**97 files in `src/dashboard` are still using legacy service layer imports** instead of the new Action Catalog system.

### The Architecture Confusion

There are **TWO SEPARATE SYSTEMS** that need clarification:

#### ✅ Contexts (Correct - NOT Legacy)
These provide **React state management** and should continue to be used:
- `AuthContext.js` - Firebase auth session state
- `NetworkContext.js` - Network connectivity state  
- `NotificationContext.js` - UI notification queue

**Purpose:** Reactive UI state that propagates across components
**Location:** `src/contexts/`
**Import:** `import { useAuth } from '@/contexts/AuthContext'`

#### ❌ Service Layer (LEGACY - Needs Migration)
These provide **business logic** and should be REPLACED by services:
- `src/services/firebase.js` - Direct Firestore operations
- `src/services/contractsService.js` - Contract operations
- `src/services/shiftsService.js` - Shift operations
- `src/onboarding/services/*` - Onboarding utilities

**Purpose:** Business logic and data operations
**Status:** DEPRECATED - Should use services instead

#### ✅ Service Tree (NEW - Target Architecture)
The new centralized system:
- `services/actions/` - Action Catalog (backend operations)
- `services/flows/` - Flow Definition Engine (wizards)
- `services/services/` - Infrastructure utilities (Firebase, auth, audit)

**Purpose:** Centralized, auditable, type-safe business logic
**Location:** `src/services/`
**Import:** `import { useAction } from '@/services/actions/hook'`

## Migration Statistics

### ❌ NOT MIGRATED (97 files)
Components still using old service layer:
```
import { db } from '../services/firebase';
import contractsService from '../services/contractsService';
```

**Count:** 97 files with 112 legacy service imports

### ✅ MIGRATED (Few files)
Components using new Action Catalog:
```
import { useAction } from '@/services/actions/hook';
const { execute } = useAction();
await execute('contract.create', { ... });
```

**Count:** 0 files found using `useAction` in dashboard

## The Confusion

The user initially saw:
- 113 files importing from `contexts/` ✅ CORRECT
  
But missed:
- 97 files importing from legacy `services/` ❌ NEEDS MIGRATION
- 0 files using new `services/actions/` ❌ NOT ADOPTED YET

## What This Means

### Contexts Are Fine
`AuthContext`, `NetworkContext`, `NotificationContext` provide **React state** and work ALONGSIDE services, not instead of it.

**Example of correct usage:**
```javascript
// ✅ CORRECT - Use both systems together
import { useAuth } from '@/contexts/AuthContext';  // For user state
import { useAction } from '@/services/actions/hook';  // For operations

const MyComponent = () => {
  const { currentUser } = useAuth();  // Get reactive user state
  const { execute } = useAction();  // Get action executor
  
  const createContract = async () => {
    await execute('contract.create', {
      userId: currentUser.uid,  // Use context state
      // ... other params
    });
  };
};
```

### Service Layer Needs Replacement

**Current (Legacy):**
```javascript
// ❌ LEGACY - Direct service imports
import { db } from '../services/firebase';
import contractsService from '../services/contractsService';

const createContract = async () => {
  await contractsService.createContract(data);
  // OR
  await addDoc(collection(db, 'contracts'), data);
};
```

**Target (Service Tree):**
```javascript
// ✅ NEW - Action Catalog
import { useAction } from '@/services/actions/hook';

const MyComponent = () => {
  const { execute } = useAction();
  
  const createContract = async () => {
    const result = await execute('contract.create', {
      parties: { professional, employer },
      terms: { startDate, endDate }
    });
  };
};
```

## Files Requiring Migration

### High Priority (Core Business Logic)
- `src/dashboard/hooks/useContractsData.js` - Contract operations
- `src/dashboard/hooks/useCalendarData.js` - Shift/calendar operations
- `src/dashboard/hooks/useDashboardData.js` - Dashboard data fetching
- `src/dashboard/hooks/useEmployeesData.js` - Employee management
- `src/dashboard/hooks/useMarketplaceData.js` - Marketplace operations
- `src/dashboard/hooks/useMessagesData.js` - Messaging operations

### Medium Priority (Pages)
- All pages in `src/dashboard/pages/` still using direct Firestore calls
- Admin pages using legacy services

### Low Priority (Onboarding Services)
- `src/dashboard/onboarding/services/*` - These might be replaced by Flow system

## Recommended Migration Plan

### Phase 1: Audit (Current Status)
- [x] Identify files using legacy services
- [x] Document services architecture
- [ ] Map legacy services to new actions

### Phase 2: Core Hooks Migration
1. Migrate dashboard hooks to use Action Catalog
2. Create any missing actions in `services/actions/catalog/`
3. Test hook behavior

### Phase 3: Page Components
1. Update pages to use migrated hooks
2. Remove direct Firestore imports
3. Add error handling for new action system

### Phase 4: Cleanup
1. Delete legacy service files
2. Update imports across codebase
3. Run linter and tests

### Phase 5: Documentation
1. Update all component documentation
2. Create migration examples
3. Update developer onboarding

## Next Steps

1. **Create Action Mapping Document**
   - Map each legacy service method to services action
   - Document parameter changes
   - Note behavioral differences

2. **Migrate One Hook as Example**
   - Start with `useContractsData.js`
   - Document the process
   - Use as template for others

3. **Build Migration Script**
   - Automate import replacements where possible
   - Generate TODO comments for manual review
   - Create codemod for common patterns

## Conclusion

**The user is 100% correct:**
- Contexts are fine (state management)
- But 97 files need migration from legacy services to services
- The refactoring is NOT complete - it's just beginning!

**Status:** 🟡 Architecture defined, migration pending

